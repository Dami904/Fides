// Decision engine (SPEC section 7). Pure: all state comes in through DecisionContext, no I/O, no clock.
// First matching rule wins, in this order: budget, address, price spike, shared record (exact),
// own history, similar-incident recall, tier. A shared record that is unreachable never softens a
// refusal and turns any PAY into ASK (fail closed).
import { median, parseAmount, formatAmount } from './amount.js';
import type { FidesConfig } from './config.js';
import { assessMerchant, inWindow, type Assessment } from './trust.js';
import type { Alert, CheckInput, Decision, DecisionContext, Tier, Verdict } from './types.js';

const MILLI = 1000n;

/** Price above factor * typical. Integer math: the factor is held in thousandths. */
export function isPriceSpike(amountRaw: bigint, typicalRaw: bigint | null, factor: number): boolean {
  if (typicalRaw === null) return false;
  return amountRaw * MILLI > typicalRaw * BigInt(Math.round(factor * 1000));
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function decide(input: CheckInput, ctx: DecisionContext, cfg: FidesConfig): Verdict {
  const amount = parseAmount(input.amount);
  const host = input.merchantHost.toLowerCase();

  // What the shared record contributes depends on its state. Detached or unreachable means we only see our own reports.
  const sharedUsable = ctx.sharedRecord === 'attached';
  const evidence = sharedUsable ? ctx.evidence : ctx.evidence.filter((e) => sameAddress(e.reporter, ctx.selfAddress));
  const similar = sharedUsable
    ? ctx.similar.filter((s) => s.merchantHost.toLowerCase() !== host && s.burnKind !== null && s.distance < cfg.similarityMaxDistance)
    : [];

  const a: Assessment = assessMerchant(evidence, ctx.reporterVerifiedCounts, ctx.nowMs, cfg);
  const tier: Tier = a.tier;
  const typical = median(ctx.pastPaidRaw);
  const factor = cfg.spikeFactor[tier === 'burned' ? 'new' : tier];
  const spiked = isPriceSpike(amount, typical, factor);
  const addressChanged = ctx.pinnedPayTo !== null && !sameAddress(ctx.pinnedPayTo, input.payTo);
  const alerts: Alert[] = addressChanged ? [{ kind: 'address_changed', merchant: host }] : [];

  const out = (
    decision: Decision,
    rule: string,
    reasons: string[],
    extra: { capAmount?: string; evidenceIds?: string[]; memoryBlobIds?: string[] } = {},
  ): Verdict => {
    let d = decision;
    const fired = [rule];
    const why = [...reasons];
    // Fail closed: an unreachable shared record can only make the answer stricter.
    if (ctx.sharedRecord === 'unreachable' && (d === 'PAY' || d === 'PAY_CAPPED')) {
      d = 'ASK';
      fired.push('shared-unavailable');
      why.push('shared record unavailable: cannot rule out reports from other agents');
    }
    return {
      decision: d,
      ...(d === 'PAY_CAPPED' && extra.capAmount ? { capAmount: extra.capAmount } : {}),
      reasons: why,
      rulesFired: fired,
      citations: { evidenceIds: extra.evidenceIds ?? [], memoryBlobIds: extra.memoryBlobIds ?? [] },
      tier,
      confidence: a.confidence,
      cannotSay: a.cannotSay,
      alerts,
    };
  };

  // 1. Budget
  const cap = parseAmount(cfg.dailyCapUsd);
  if (ctx.spentTodayRaw + amount > cap) {
    return out('ASK', 'budget', [
      `spend today ${formatAmount(ctx.spentTodayRaw)} plus ${formatAmount(amount)} exceeds the daily cap ${formatAmount(cap)}`,
    ]);
  }

  // 2. Address. A changed payout address with a price spike is a refusal; otherwise ask a human.
  if (addressChanged) {
    return spiked
      ? out('REFUSE', 'address', ['payout address changed from the pinned address and the price spiked'])
      : out('ASK', 'address', ['payout address changed from the pinned address']);
  }

  // 3. Price spike
  if (spiked) {
    return out('ASK', 'price-spike', [
      `price ${formatAmount(amount)} is above ${factor} times the typical ${formatAmount(typical!)} for a ${tier} merchant`,
    ]);
  }

  // 4. Shared record, exact: burns from independent reporters. This agent's own verified burn counts as one of them:
  //    it is a signed, anchored report like any other, and it may have come back from the shared record after the
  //    agent lost its local state. One other reporter only caps the payment, and only if this agent was never burned.
  const allBurns = inWindow(evidence, ctx.nowMs, cfg).filter((e) => e.verdict === 'burned');
  const othersBurns = allBurns.filter((e) => !sameAddress(e.reporter, ctx.selfAddress));
  const selfBurned = allBurns.length > othersBurns.length;
  const othersReporters = [...new Set(othersBurns.map((e) => e.reporter.toLowerCase()))];
  const burnReporters = othersReporters.length + (selfBurned ? 1 : 0);
  if (othersReporters.length > 0 && burnReporters >= cfg.burnRefuseMinReporters) {
    const ids = allBurns.map((e) => e.id);
    return out('REFUSE', 'shared-burns', [`${burnReporters} independent reporters${selfBurned ? ', this agent among them,' : ''} have verified burns for this merchant`], {
      evidenceIds: ids,
    });
  }
  const burnIds = othersBurns.map((e) => e.id);
  if (othersReporters.length === 1 && !selfBurned) {
    const capRaw = parseAmount(cfg.burnCapAmount);
    return amount <= capRaw
      ? out('PAY_CAPPED', 'shared-burn', ['one other reporter has a verified burn for this merchant: small payments only'], {
          capAmount: cfg.burnCapAmount,
          evidenceIds: burnIds,
        })
      : out('ASK', 'shared-burn', [`one other reporter has a verified burn and ${formatAmount(amount)} is above the ${cfg.burnCapAmount} limit`], {
          evidenceIds: burnIds,
        });
  }

  // 5. Own history
  const ownBurns = inWindow(evidence, ctx.nowMs, cfg).filter(
    (e) => e.verdict === 'burned' && sameAddress(e.reporter, ctx.selfAddress),
  );
  if (ownBurns.length > 0) {
    const ids = ownBurns.map((e) => e.id);
    return ownBurns.length >= cfg.ownBurnRefuseCount
      ? out('REFUSE', 'own-history', [`this agent was burned ${ownBurns.length} times by this merchant`], { evidenceIds: ids })
      : out('ASK', 'own-history', ['this agent was burned by this merchant before'], { evidenceIds: ids });
  }

  // 6. Similar-incident recall (the Walrus Memory learning loop). Burn narratives of OTHER merchants
  //    whose pattern matches what is happening now. Already filtered by exact host and distance above.
  const tags = situationTags(a, typical, amount);
  const matches = similar.filter((s) => tags.has(s.pattern));
  if (matches.length > 0) {
    return out('ASK', 'similar-incident', [`${matches.length} similar incident(s) at other merchants: ${[...new Set(matches.map((m) => m.pattern))].join(', ')}`], {
      memoryBlobIds: matches.map((m) => m.blobId),
      evidenceIds: a.usedIds,
    });
  }

  // 7. Tier
  if (tier === 'trusted' || tier === 'established') {
    return out('PAY', 'tier', [`${tier} merchant: ${a.cleanCount} clean outcomes, no burns`], { evidenceIds: a.usedIds });
  }
  if (tier === 'burned') {
    return out('ASK', 'tier', ['merchant tier is burned'], { evidenceIds: a.usedIds });
  }
  return out('ASK', 'tier', [a.cannotSay ? 'cannot say: not enough history to classify this merchant' : 'new merchant'], {
    evidenceIds: a.usedIds,
  });
}

/**
 * Precursor patterns visible now, matched against the pattern tag stored with a recalled burn narrative.
 * A burn at another merchant tagged "clean_streak" means: that merchant also looked clean first, then burned.
 * (A changed payout address never gets here, rule 2 already decided.) Starting set, extend with the simulation.
 */
export function situationTags(a: Assessment, typical: bigint | null, amount: bigint): Set<string> {
  const tags = new Set<string>();
  if (a.tier === 'new') tags.add('new_merchant');
  if (typical !== null && amount > typical && a.cleanCount >= 3) tags.add('price_up_after_clean_streak');
  if (a.cleanCount >= 3 && a.burnCount === 0) tags.add('clean_streak');
  return tags;
}
