# Fides: product and build spec

Source of truth for the build. Read it fully before writing code.

Status legend used throughout:
- **VERIFIED (2026-10-25)**: confirmed from the cited official page on that date. Re-check if the build starts much later.
- **UNVERIFIED**: not confirmed. Verify against current official docs and record the result in `docs/DAY1.md` before building on it.

Links for everything referenced are in section 22. A log of what was verified and what was not is in section 23.

---

## 1. One line

**Fides is a credit bureau for machine payments.** Any agent, wallet or payment client can ask "should I pay this merchant?" and get a verdict backed by evidence that other agents signed and sealed after real payments on Sui.

Plain version: an agent that has never met a scammer refuses to pay him, because another agent got burned and remembered.

Name: Fides, Latin for trust and good faith. It collides with an unrelated open-source privacy tool (Ethyca, PyPI package `ethyca-fides`). Use qualified names for the repo, packages and handles (for example `fides-sui`). Say the meaning of the word once, in the first sentence of the README and the pitch.

---

## 2. The hackathon

Walrus x Tatum "Total Recall". Tagline: "Get your memory back." Theme: apps that remember and get sharper over time.

Dates: build Oct 20 to Nov 10 2026. Submission deadline **Nov 10 2026, 17:00 UTC (6 PM Lagos)**. Target submitting by the evening of Nov 9. Judging Nov 11 to 16, winners announced Nov 17. Prizes are paid in USDC (winner confirms email and wallet within 14 days). Discord office hours run during the build.

Prize pool $4,500:
- Three tracks, $1,000 each (1st $500, 2nd $300, 3rd $200):
  1. Markets & Sports Prediction.
  2. **Smart Agents for Real Life**: "Agents that monitor inboxes, expenses, habits, or workflows. Portable memory means they pick up where they left off across tools and sessions." Example ideas listed: research agent with source trust scores; expense watchdog with long term memory; workflow bots that learn your escalation rules. Fides fits the first two directly.
  3. Consumer Finance Apps (fallback framing).
- Special awards, $500 each:
  - **Best Walrus Memory**: "Deepest learning loop. Memories that visibly change the product."
  - **Best Use of Agent Payments**: "Best app across tracks using x402 or MPP, settled on Sui."
  - Best Tatum AI Builder app: best product built primarily with ai.tatum.io. Optional, treat as a bonus only.

Our targets: track Smart Agents for Real Life, plus the Walrus Memory award and the Agent Payments award.

Submission checklist (all must be true):
1. Walrus Memory integrated and writing on **Mainnet**.
2. **Tatum RPC** used for onchain data.
3. At least **10 memories stored on Mainnet**.
4. A **published blog post**: what it does, how it uses Tatum and Walrus, and how it learned over time.
5. A working demo and a **public GitHub repo**.
6. Optional: build with Tatum AI Builder for the dedicated bonus.

Submission form (at the hackathon site) asks for: email, Discord handle, LinkedIn, how you heard about the event, whether this is your first Web3 project, Tatum ID, SUI address, Account ID (SUI), MEMWAL_AGENT_ID, project description, short demo video (2 to 3 minutes), GitHub repo, experience building with Walrus, experience building with the Tatum AI Builder. Collect the IDs early.

Judging: 30% Walrus and Tatum integration ("meaningful and creative use of Walrus Memory, as well as building with Tatum RPCs or Data APIs"), 30% technical quality ("clean code and successful Tatum Sui RPC integration"), 20% creativity, 20% presentation ("clear documentation and a working demo"). Bonus: sharing the project on X or LinkedIn, tagging @Tatum_io and @WalrusFoundation is optional and may earn extra points.

Rules to respect: one submission per person; work must be original and completed or materially advanced during the hackathon (this is a fresh build); 18+, non-sanctioned. The Event Rules preamble mentions a feedback and form platform goal that looks like leftover boilerplate, ignore it. Read the full rules page once more before submitting (link in section 22).

---

## 3. The problem

Agents increasingly pay for things themselves (APIs, data, compute): a server answers `402 Payment Required` with a price, asset and payout address, and the agent pays and retries. Three failure modes:
- The merchant takes the money and returns junk or nothing.
- The merchant changes its payout address or raises the price (the classic attack).
- Every agent learns these lessons alone and loses money first. The knowledge dies with the agent.

---

## 4. What Fides is

Two layers built together:

1. **The guard.** A decision engine inside each agent. Before any payment it returns PAY, PAY_CAPPED, ASK (the human) or REFUSE, with reasons and citations.
2. **The shared record.** After each payment the agent writes a signed, verified outcome that any other Fides client can read. This is what makes Fides a trust layer and not a private spend log.

On top of both sits a public query surface (SDK, MCP tool, lookup page), so other people's agents can depend on Fides. That is the infrastructure framing and the main differentiator.

### Deletion test (must be demonstrable)
Remove the shared record and every agent has to be burned on its own. Trust decisions become wrong, not just slower. The demo and the simulation must show this as a visible number.

---

## 5. Architecture

| Data | Where | Why |
|---|---|---|
| Daily totals, caps, merchant tier, pinned payout address, in-flight payment claims | Local exact state (SQLite) | Must be exact and atomic. Walrus Memory is semantic recall, not keyed lookup. |
| Narrative of what happened, plus the signed evidence JSON as text | **Walrus Memory, Mainnet**, in the shared Fides Registry account | Recalled by meaning ("this merchant behaves like the one that burned us"). The relayer pays for the write. |
| Evidence anchor: merchant, evidence sha256, payment tx digest, verdict | **Sui Mainnet** (small Move module that emits an event) | Exact, public, tamper-evident index that anyone can read through Tatum. |
| Settlement, finality, event reads, payment verification | **Tatum Sui RPC** | Required. Also keeps unsettled payments out of memory. |

Do not use Sibyl Memory. It is not the hackathon substrate.

### Walrus Memory facts (VERIFIED 2026-10-25)
- Package `@mysten-incubation/memwal`, entry points `MemWal` (default), `MemWalManual` (client-side embeddings and Seal, needs `@mysten/sui`, `@mysten/seal`, `@mysten/walrus`), `withMemWal` (Vercel AI SDK middleware).
- `MemWal.create({ key, accountId, serverUrl?, namespace? })`. `key` is an Ed25519 private key in hex (a delegate key). `accountId` is the MemWalAccount object ID on Sui. Mainnet relayer: `https://relayer.memory.walrus.xyz`. Generate the account ID and delegate key in the playground at memory.walrus.xyz.
- `remember(text, namespace?)` returns `{ job_id, status }`. `waitForRememberJob(jobId, opts?)` polls until done and returns `{ id, job_id, blob_id, owner, namespace }` (default timeout 60 s). Always wait before recalling.
- `recall({ query, limit?, topK?, namespace?, maxDistance?, sort?, scoringWeights?, timeoutMs? })` returns `{ results: [{ blob_id, text, distance, created_at? }], total }`. Lower distance means more similar. Default limit 10, relayer cap 100. `sort` is `"relevance"` or `"recent"`.
- `analyze(text, namespace?)` extracts facts with an LLM and stores each one (`analyzeAndWait` waits). `restore(namespace, limit?)` re-indexes blobs from Walrus. `health()` checks the relayer is reachable (it does not validate your key). `listNamespaces`, `listMemories` return metadata only.
- All operations are scoped to **owner + namespace**.
- Account functions from `@mysten-incubation/memwal/account`: `generateDelegateKey`, `createAccount`, `addDelegateKey`, `removeDelegateKey` (owner only).
- The relayer sees **plaintext** (it encrypts with Seal and decrypts for recall). Never put private data in memory. Evidence is public by design, so this is acceptable.
- **No documented delete or forget method. No documented cross-account sharing. `ask` is not documented in the API reference** (do not depend on it).
- Node requirement per the quick start: Node 22 or newer (check the exact minimum patch version there), or Bun 1+.

### Consequences for the design
1. **Recall is fuzzy.** Semantic search cannot be trusted for exact merchant lookup. Always put the exact merchant host and `payTo` in the memory text, then **post-filter recall results in code by exact host**. Exact lookups come from the Sui anchor events and the local `evidence_index`, never from recall alone.
2. **Shared memory design (decided): one shared "Fides Registry" Walrus Memory account.** Cross-account reads are not documented, but delegate keys are. The Registry account is owned by the project, namespace `merchants`, and each agent (A, B, and others) holds its own delegate key on that account via `addDelegateKey`. Agents therefore share one recall space. Because every record is signed and verified at read time (section 8), a delegate cannot make others believe forged records. Each agent may also keep a private account/namespace for its own notes. UNVERIFIED: test two delegate keys writing and recalling the same namespace (day 1 check).
3. **"Delete the shared memory" in the demo is implemented as detaching**: the client switches the shared record off (or points at an empty namespace). Do not claim data was deleted. Say "remove access to the shared memory". Distinguish **absent** from **empty**: an unreachable shared record fails closed (verdict ASK, reason "shared record unavailable"), while a reachable empty one is an honest cold start. This distinction is borrowed from Wrasse.
4. **Storing public Walrus blobs on mainnet costs WAL.** There is no public publisher on mainnet. Therefore evidence JSON is stored as Walrus Memory text (the relayer pays), its sha256 is anchored on Sui, and the Fides registry service serves content-addressed copies for public re-verification. Optional upgrade if a few cents of WAL is available: also store the evidence as a public Walrus blob with `@mysten/walrus`.

### Hybrid memory rule
Exact numbers and anything atomic (caps, claims, pinned addresses) live in SQLite. Walrus Memory holds narrative, similar-incident recall and the shared record. Never rely on Walrus Memory for keyed lookups.

### Write rule (from the Wrasse design)
Nothing becomes memory from an intention. A memory or evidence record is written only for a payment that has been **verified through Tatum and has reached finality**.

---

## 6. The payment flow

Payments use **MPP via `@suimpp/mpp`** on Sui mainnet (VERIFIED: package supports Sui USDC, mainnet/testnet/devnet, includes an x402 dialect at `@suimpp/mpp/x402`, verifies payments server-side over **gRPC**, accepts a custom `rpcUrl`, uses a digest store against replay, requires a signed proof since 0.7.0). The x402 Sui `exact` scheme spec and a testnet-only community facilitator also exist (section 22). The award accepts x402 or MPP settled on Sui.

1. Agent calls a paid endpoint and receives a 402 with price, asset and `payTo`.
2. **Hard rules** run first against exact state (section 7).
3. **Shared record** is consulted: exact lookup from the anchor and local index, plus semantic similar-incident recall.
4. **Own history** is checked.
5. If the verdict allows it, the agent pays with USDC on Sui. The merchant verifies the payment through its gRPC endpoint. **Point that endpoint at Tatum's Sui gRPC gateway if it serves gRPC** (UNVERIFIED), so Tatum is on the critical path of payment verification itself.
6. The agent confirms the transaction and finality through Tatum.
7. The agent checks what came back: response shape against the merchant's advertised schema, freshness, delivery time, amount versus quote, `payTo` versus pinned address.
8. It writes the outcome: a signed evidence record to Walrus Memory (narrative plus JSON), its sha256 anchored on Sui, and exact state to SQLite.

Funding: the payment demo needs a small amount of SUI for gas and a little USDC on mainnet. Amounts are cents.

---

## 7. Decision engine

Verdicts: `PAY`, `PAY_CAPPED` (pay up to a lower limit), `ASK`, `REFUSE`. Escrow and repricing verdicts are stretch only.

Rules in order (first match wins unless noted). All thresholds live in one config file (section 21) and are starting values to calibrate.

1. **Budget**: spend today plus this payment exceeds the daily cap, then `ASK`.
2. **Address**: `payTo` differs from the pinned address for this merchant, then `REFUSE` if the price also spiked, otherwise `ASK`. Raise an alert that stays open until a human clears it.
3. **Price spike**: price above `factor(tier) * typical`, where typical is the median of past paid amounts and factor is 3 (new), 2 (established), 1.5 (trusted), then `ASK`.
4. **Shared record, exact**: two or more independent reporters with verified burns inside the window, then `REFUSE`. One verified burn, then `PAY_CAPPED` or `ASK`.
5. **Own history**: this agent was burned by the merchant before, then `REFUSE` or `ASK`.
6. **Similar-incident recall (the Walrus Memory learning loop)**: recall from the shared namespace using the current situation as the query (merchant host, `payTo`, price, recent pattern). Post-filter by exact host. If strongly similar results (distance below `similarityMaxDistance`) are burn narratives of **other** merchants with the same pattern (for example "address changed after a clean streak", "price jumped right after trust was earned"), downgrade the verdict to `ASK` and cite them. This is how recalled memories visibly change a decision beyond the stats, and it is where Walrus Memory is on the critical path.
7. **Tier**: `trusted` or `established` then `PAY`. `new` or unknown then `ASK`.

Trust tiers per merchant (verified clean and burned outcomes, shared plus own, reporters weighted, outcomes decayed):
- `new`: fewer than 3 verified clean outcomes.
- `established`: at least 3 clean and the lower bound of the Wilson interval on the clean rate above 0.6.
- `trusted`: at least 10 clean and lower bound above 0.8.
- A verified burn drops the tier immediately. Recovery is slow. If there is not enough history to classify, return `cannotSay: true` and `ASK`. Do not guess.

Every verdict returns: decision, reasons, rules fired, citations (evidence ids and memory blob ids used), tier, confidence at decision time (used in section 11) and `cannotSay`.

**Atomic claims.** Reserve spend and claim a payment inside one SQLite transaction (`BEGIN IMMEDIATE`) keyed by an idempotency key, so two concurrent payments cannot both pass the cap. (A prior project did a non-atomic read then write here. Do not repeat that.)

Open design point: who decides a merchant was really bad? For the build: the signed evidence plus the rule (several independent reporters, weighted by track record, response hash rechecked against the published schema). Testable. No voting system.

---

## 8. Evidence format and verification (`fides.evidence/v1`)

Canonical JSON: UTF-8, sorted keys, no insignificant whitespace, no floats (amounts as strings or integers). Digest is **sha256 of the canonical bytes**, hex. When verifying, hash the **fetched bytes**, never a re-serialised parsed object (re-serialising breaks interoperability between implementations).

```json
{
  "schema": "fides.evidence/v1",
  "issuedAt": "ISO-8601",
  "reporter": { "agentId": "string", "suiAddress": "0x..." },
  "merchant": { "host": "string", "payTo": "0x..." },
  "payment": { "txDigest": "string", "amount": "string", "asset": "string", "quotedAmount": "string", "network": "sui-mainnet" },
  "exchange": { "requestHash": "hex", "responseHash": "hex", "responseBytes": 0, "latencyMs": 0 },
  "checks": { "schemaValid": true, "fresh": true, "onTime": true, "amountMatchesQuote": true, "payToMatchesPinned": true },
  "verdict": "clean | burned",
  "burnKind": "junk | no_delivery | price_changed | address_changed | null",
  "finality": { "checkpoint": "string", "verifiedVia": "tatum" },
  "signature": "base64 Ed25519 signature by reporter.suiAddress over the canonical bytes of this object without the signature field"
}
```

A reader accepts a report only if **all** of these hold:
1. The evidence text is retrieved and its sha256 equals the digest in the Sui anchor event for that evidence.
2. The **signature verifies** against `reporter.suiAddress` (use the Sui personal-message signing and verification helpers from `@mysten/sui`; confirm exact function names). This stops someone from copying another agent's public payment digest into a fake report.
3. The Sui **anchor event's sender equals `reporter.suiAddress`**.
4. The payment transaction `payment.txDigest` exists, is final (fetched via Tatum), its sender equals `reporter.suiAddress`, and it transferred the stated amount to `merchant.payTo`.
5. The record is well formed and under the size limit.

A report that fails any check is shown as rejected with the reason, never silently dropped and never believed. A failed lookup is an error, never "no ratings".

Honest limits: proof of payment proves a payment happened, not that the service was bad. A merchant can also pay itself through its own agents to build clean reports (it costs only gas). Mitigations: reporter weighting, capping any single reporter's influence, requiring several independent reporters for hard refusals, rechecking response hashes against the published schema. Cluster or Sybil detection is out of scope. Say this plainly in the README.

### Anchor
A minimal Move module with `report(merchant: String, evidence_sha256: vector<u8>, pay_tx_digest: vector<u8>, verdict: u8)` that emits a `Report` event (sender is recorded by the chain). Publish to mainnet (gas is cents). Read events through Tatum. UNVERIFIED: which read APIs Tatum's Sui gateway serves. Tatum's docs list both "Sui - JSON-RPC" and "Sui - gRPC", and Sui is retiring JSON-RPC (the community facilitator author had to move off retired JSON-RPC calls to GraphQL). **Prefer gRPC**; confirm event queries work with your key on day 1 and record the result. If event queries are unavailable through Tatum, keep a local index fed by your own writes plus Tatum for transaction and finality checks.

---

## 9. Public surfaces (the infrastructure framing)

1. **SDK**: `fides.check(input) -> Verdict` and `fides.report(outcome)`. Drop-in for any payment client.
2. **MCP server** with tools `fides_check`, `fides_report`, `fides_lookup`, so any LLM agent can call Fides before paying.
3. **Public lookup page**: open a merchant record, see its trust timeline and evidence list, and press **Re-verify** to fetch the evidence, recompute the sha256, compare with the Sui anchor, verify the signature and check the payment transaction through Tatum, step by step.

Public endpoints must be rate limited and must only fetch from allowlisted hosts (no fetching arbitrary URLs taken from chain data).

---

## 10. Mock merchants and agents

Real third-party merchants are out of scope. Three merchants we control, each charging through `@suimpp/mpp` (`mppx.charge`) on Sui mainnet with tiny USDC amounts:
- **good** (`/data/prices`): correct, fresh, on time.
- **flaky** (`/data/news`): about 40% of calls return junk (wrong schema or stale `asOf`) or time out.
- **malicious** (`/data/signal`): behaves well for a configurable number of calls (default 5), then on demand (`POST /admin/turn-malicious`) swaps its payout address and raises the price 4x.

Each merchant publishes `/.well-known/fides-schema.json` describing the expected response shape and maximum age, and responds with `{ "schema": "...", "asOf": "ISO-8601", "data": ... }`. This makes "response matches the advertised schema" and "fresh" deterministic checks.

Two agent identities, **A** and **B**, each with its own Sui address, local SQLite state and a delegate key on the shared Fides Registry account (section 5).

If MPP on Sui mainnet turns out to be impractical, fallbacks in order: x402 dialect of `@suimpp/mpp`, the x402 Sui `exact` scheme with the community facilitator on testnet (only if the rules accept testnet), then a mock settlement with real Sui transfers and your own verifier.

---

## 11. Self-grading and simulation

- **Simulation**: 20 agents versus 6 merchants, 2 of them bad. Run it with and without the shared record. Report the measured burn counts. Simulated agents may use mocked settlement for speed, but the headline A/B demo uses real mainnet payments.
- **Self-grading (stretch)**: log every verdict with the confidence it had, score it against the real outcome later, and publish "when Fides said trusted, the merchant was clean X% of the time." Drop this before dropping the simulation.

---

## 12. UI (in scope, and a priority)

Polished and expressive. The UI shows reasoning, not just results. Do not ship a default dark crypto dashboard. Direction: seal, stamp and ledger, restrained and precise, with purposeful motion where evidence is verified.

Four screens:
1. **Live decision feed**: each payment attempt as a card with the verdict, the memories recalled (with distance), the rule that fired and the evidence cited.
2. **Split view, Agent A and Agent B**: the same merchant side by side. B refuses and cites A's signed record. A **"detach shared memory"** toggle visibly flips B's decision to pay. A third state, "shared memory unreachable", shows the fail-closed ASK.
3. **Merchant record page**: trust timeline (new, established, trusted, burned) and evidence list. Each item has a **Re-verify** button that runs the checks in section 8 as an animated step list.
4. **Simulation board**: grid of 20 agents by merchants, burns lighting up, live counter with and without Fides.

Architecture rule: the UI reads from a `FidesApi` interface (section 21) with two implementations, `fixtures` and `live`. Build against fixtures from about day 6 so the UI and the engine never block each other. Make design mockups of the four screens before building them.

---

## 13. Repo layout and environment

The developer machine is Windows. Use WSL2 if available, otherwise native Node, and keep scripts cross-platform (no bash-only scripts without a Node equivalent).

```
fides/
  CLAUDE.md
  SPEC.md
  docs/            DAY1.md, ASSUMPTIONS.md, blog draft, demo script
  packages/
    core/          policy engine, trust scoring, types, config
    state/         SQLite exact state (claims, caps, pinned addresses, evidence index)
    memory/        Walrus Memory wrapper (@mysten-incubation/memwal)
    chain/         Sui + Tatum client, payment and finality verification, anchor reads
    evidence/      build, canonicalize, sign, store, anchor, verify
    sdk/           fides.check, fides.report
    mcp/           MCP server
    move/          Fides anchor Move module
  apps/
    merchants/     mock merchants (good, flaky, malicious) using @suimpp/mpp
    agent/         demo agents A and B
    sim/           simulation runner
    registry/      small service serving content-addressed evidence and the public API
    web/           UI (feed, split view, merchant page, simulation board)
  scripts/         day-1 checks, mainnet memory seeding
  .env.example     names only, no values
```

Suggested stack, change it if day 1 says otherwise: TypeScript, `@mysten/sui`, `@mysten-incubation/memwal`, `@suimpp/mpp`, `better-sqlite3`, Vitest, a React framework for `apps/web`.

Environment variable names (values in `.env`, never committed): `TATUM_API_KEY`, `TATUM_SUI_GRPC_URL`, `TATUM_SUI_RPC_URL`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_KEY_A`, `MEMWAL_KEY_B`, `SUI_PRIVATE_KEY_A`, `SUI_PRIVATE_KEY_B`, `SUI_PRIVATE_KEY_MERCHANTS`, `FIDES_DB_PATH`, `FIDES_DAILY_CAP_USD`.

---

## 14. Schedule (dated)

Today is Oct 25. Deadline Nov 10, 17:00 UTC. Core freeze Nov 6.

- **Oct 25 to 26: de-risk.** Section 15. Nothing else starts until written up.
- **Oct 27 to Nov 1: core.** Policy engine with tests, SQLite state, mock merchants, evidence build/sign/verify, Walrus Memory write path, Move anchor, Tatum finality check.
- **Oct 30 onward (parallel): UI against fixtures.**
- **Nov 1 to 3: public surfaces.** SDK, MCP server, registry service, lookup page with Re-verify, shared-record read path and agent B.
- **Nov 4 to 6: integration.** UI on live data, simulation, the 10+ mainnet memories produced by real runs. **Nov 6: core freeze, bug fixes only.**
- **Nov 7 to 9: finish.** UI polish, demo video, blog post, README, social post, submission form. Submit by the evening of Nov 9.
- **Nov 10:** buffer only.

Cut order if time slips: merchant-signed payout address (already stretch), then self-grading, then optional public Walrus blobs, then escrow/reprice verdicts. Never cut the SDK, MCP tool, lookup page or Re-verify.

---

## 15. Day 1 to 2 checks (write results to `docs/DAY1.md`)

1. Write one memory to Walrus Memory on **mainnet** through the hosted relayer, wait for the job, recall it, and confirm there is no fee or note any rate limit.
2. **Two delegate keys on one account**: add a second delegate key with `addDelegateKey`, write with key A, recall with key B in the same namespace. Decide shared-registry (expected) versus fallback.
3. Tatum Sui with the user's key: confirm the auth header (check the Tatum authentication docs), which API types actually answer (JSON-RPC, gRPC), whether **event queries** work, and whether `@suimpp/mpp` can use Tatum's gRPC endpoint as `rpcUrl`. Mind the rate limit (free plan: 3 requests per second, 100,000 credits). Record whether the free key reaches Sui at all.
4. One end-to-end MPP payment with `@suimpp/mpp` on Sui mainnet, merchant and client, tiny USDC amount.
5. Publish the Move anchor module on mainnet and emit one event; read it back through Tatum.
6. Sign an evidence record with a Sui key and verify the signature in code.
7. Check the hackathon rules page: does the Agent Payments award require **mainnet** settlement, and how are "memories on Mainnet" counted (each `remember`, each analyzed fact)?
8. Fund a small test wallet (SUI for gas, a little USDC). Expected total spend is a few dollars. Optional: a few cents of WAL if you want public Walrus blobs.

Design for Tatum's rate limit: cache reads, batch where possible, no polling loops.

---

## 16. Definition of done

- 10 or more memories on Walrus Memory Mainnet, produced by real runs.
- Real MPP payments on Sui verified through Tatum, with finality gating every memory write.
- The A/B demo works live, including the detach toggle and the fail-closed state.
- At least one decision visibly changed by similar-incident recall (rule 6), shown with the cited memories.
- Re-verify works against real evidence, real anchor events and real Sui transactions, including a rejected forged record.
- Simulation produces a measured with and without Fides result.
- SDK, MCP server and lookup page are usable by someone else from the README.
- Policy engine has unit tests for every rule, the cannot-say case, atomic claims and the signature/forgery cases.
- Public repo, README with the name's meaning, architecture diagram, setup, and a plain section on what is verified, what is not, and the honest limits.
- Blog post published. Demo video recorded (2 to 3 minutes). Social post shared.
- Submission form fields collected and submitted.

## 17. Demo script (3 minutes)

1. Agent A, cold start, asks about every merchant and approves three.
2. A pays the flaky merchant, gets junk, and records a signed burn.
3. Agent B starts fresh, has never met that merchant, reads the shared record, and refuses. Lossless.
4. The malicious merchant swaps its payout address and raises the price 4x. Both agents catch it. A similar-incident recall also flags a different new merchant with the same pattern.
5. Detach the shared memory: B pays the flaky merchant and gets burned. (Say "remove access", not "delete".)
6. Open the merchant page and press Re-verify. Show a forged record being rejected.
7. Show the simulation board: the burn count with and without Fides.

## 18. Out of scope (do not build)

Multi-chain support, real third-party merchants, token economics or fees, governance or staking, escrow and repricing (stretch only), merchant-signed payout address (stretch only), Sybil/cluster detection.

## 19. Prior art we borrowed ideas from (credit in the README)

We own none of these repos and copy no code. Ideas only, with credit:
- spending-memory: pay/ask/refuse policy, escalation, address-change alert, price-spike factors, refuse-to-start without a cap.
- bv7x-memory: cannot-say cold start, minimum history before classifying, Wilson intervals, with-and-without deletion gate.
- Vouch: sealing evidence with a hash so any reader can re-verify (we fix its gaps: raw-bytes hashing, SSRF guard, signatures).
- Meritor: decayed, prior-shrunk trust and tiered credit decisions.
- Wrasse: write memory only from receipts verified after finality, absent versus empty store.

---

## 20. Threat model and honest limits

| Threat | Handling |
|---|---|
| Fake burn report using someone else's public payment digest | Evidence must be signed by the payer, anchor sender must match, and the payment sender must match (section 8). |
| Slander by paying a tiny amount then reporting a false burn | Reporter weighting, influence cap per reporter, several independent reporters for hard refusals, response-hash recheck. Cannot be fully removed. |
| Merchant washing its own reputation with self-paying agents | Same weighting and caps. Costs only gas, so this is a known limit. State it. |
| Tampered evidence copy | sha256 anchored on Sui; mismatch is rejected visibly. |
| Replay of a payment proof | `@suimpp/mpp` digest store and signed proof; our evidence also requires the reporter signature. |
| SSRF through URLs in chain data | Fetch only from allowlisted hosts; size limit; timeout. |
| Registry or relayer going down | Absent store fails closed (ASK); empty store is a cold start. |
| Relayer sees plaintext | Nothing private is stored. Document it. |
| Spam of anchor events | Readers ignore unverifiable events; registry rate limits; weights make cheap spam worthless. |
| Concurrent double-spend past the cap | Atomic claims in one SQLite transaction. |

---

## 21. Interface contracts (starting point, refine while building)

```ts
type Decision = 'PAY' | 'PAY_CAPPED' | 'ASK' | 'REFUSE';
type Tier = 'new' | 'established' | 'trusted' | 'burned';

interface CheckInput {
  ownerId: string; merchantHost: string; payTo: string;
  amount: string; asset: string; network: string; resource: string;
}
interface Verdict {
  decision: Decision; capAmount?: string;
  reasons: string[]; rulesFired: string[];
  citations: { evidenceIds: string[]; memoryBlobIds: string[] };
  tier: Tier; confidence: number; cannotSay: boolean;
}
interface Outcome { /* the fides.evidence/v1 fields except signature and checks computed by the SDK */ }

interface FidesApi {
  check(i: CheckInput): Promise<Verdict>;
  report(o: Outcome): Promise<{ evidenceId: string; memoryBlobId: string; anchorTx: string }>;
  getMerchant(host: string): Promise<MerchantRecord>;
  listDecisions(filter?: { ownerId?: string; merchant?: string }): Promise<DecisionCard[]>;
  verifyEvidence(evidenceId: string): AsyncIterable<VerifyStep>;   // for the Re-verify animation
  runSimulation(cfg: SimConfig): AsyncIterable<SimEvent>;
  setSharedRecord(mode: 'attached' | 'detached'): Promise<void>;
}
```

MCP tools: `fides_check(input) -> Verdict`, `fides_report(outcome) -> receipt`, `fides_lookup(host) -> MerchantRecord`. Return citations in every response.

SQLite tables (minimum): `merchants(host pk, pinned_pay_to, first_seen, local_tier)`, `claims(idempotency_key pk, owner, merchant, amount, status, created_at)`, `spend(owner, utc_date, total, primary key (owner, utc_date))`, `decisions(id pk, owner, merchant, decision, rules_json, citations_json, confidence, created_at, outcome_json)`, `evidence_index(evidence_id pk, merchant, reporter, sha256, tx_digest, anchor_tx, verdict, status, reject_reason, verified_at)`, `alerts(id pk, merchant, kind, open, created_at)`.

Config defaults (all starting values, calibrate with tests and the simulation):

```
dailyCapUsd            required, no default; refuse to start without it
spikeFactor            { new: 3, established: 2, trusted: 1.5 }
tiers                  { establishedMinClean: 3, establishedWilsonLb: 0.6, trustedMinClean: 10, trustedWilsonLb: 0.8 }
wilsonZ                1.96
windowDays             30
decayHalfLifeDays      14
reporterWeight         min(1, log2(1 + verifiedReports) / log2(1 + 20))
burnRefuseMinReporters 2
similarityMaxDistance  calibrate on day 3 using real recall distances
maxEvidenceBytes       524288
fetchTimeoutMs         20000
allowedFetchHosts      registry host, Walrus hosts you use, Tatum gateway
```

---

## 22. Links

Hackathon
- Landing page: https://tatum.io/hackathon/total-recall
- Rules, tracks, FAQ and submission form (the real content): https://recall-tatum-walrus.vercel.app/

Walrus Memory
- What it is: https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory
- Choose your path: https://docs.wal.app/walrus-memory/getting-started/choose-your-path
- Quick start: https://docs.wal.app/walrus-memory/getting-started/quick-start
- SDK quick start: https://docs.wal.app/walrus-memory/sdk/quick-start
- SDK API reference: https://docs.wal.app/walrus-memory/sdk/api-reference
- Core components (accounts, delegates, namespaces, relayer): https://docs.wal.app/walrus-memory/fundamentals/architecture/core-components
- Funding storage: https://docs.wal.app/walrus-memory/fundamentals/architecture/funding-storage
- Walrus storage costs: https://docs.wal.app/dev-guide/costs.html
- Playground to create the account ID and delegate key (mainnet): https://memory.walrus.xyz
- Hosted mainnet relayer: https://relayer.memory.walrus.xyz
- npm package: @mysten-incubation/memwal

Tatum
- Plans and limits: https://docs.tatum.io/docs/plans-limits
- Authentication: https://docs.tatum.io/docs/authentication
- Connecting to the RPC gateway: https://docs.tatum.io/reference/how-to-connect-rpc-gateway
- Sui reference (JSON-RPC and gRPC): https://docs.tatum.io/reference/rpc-sui
- Sui integration changelog: https://docs.tatum.io/changelog/sui-blockchain-integration-rpc-mainnet-testnet-devnet
- Tatum for Sui: https://tatum.io/tatum-for-sui and https://tatum.io/chain/sui
- Building on Sui with Tatum RPC: https://tatum.io/blog/building-on-sui
- Gateways: https://sui-mainnet.gateway.tatum.io, https://sui-testnet.gateway.tatum.io, https://sui-devnet.gateway.tatum.io
- AI Builder (optional): https://ai.tatum.io

Payments on Sui
- @suimpp/mpp (Sui USDC for MPP, gRPC verification, x402 dialect): https://socket.dev/npm/package/@suimpp/mpp , site https://suimpp.dev , source https://github.com/mission69b/suimpp
- x402 `exact` scheme for Sui (spec): https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_sui.md
- Community x402 facilitator on Sui (testnet only, unofficial): https://forums.sui.io/t/the-first-live-x402-facilitator-on-sui-agents-pay-usdc-per-api-call-verified-humans-read-free/49391 , source https://github.com/DrVelvetFog/sui-x402-facilitator
- Sui RPC and data providers: https://docs.sui.io/develop/accessing-data/rpc-providers

Name collision
- Ethyca Fides on PyPI: https://pypi.org/project/ethyca-fides

Prior art (ideas only)
- https://github.com/bubon-ik/spending-memory (branch sibyl-submission)
- https://github.com/Mischa0x/bv7x-memory
- https://github.com/egbujor-emmanuel/vouch
- https://github.com/mrnetwork0001/Meritor
- https://github.com/jesterkeri/wrasse
- https://github.com/tomcode1000/AIRTIGHT , https://github.com/D0xedDevi0/dejavu-sibyl-memory , https://github.com/drexthealpha/Knos (reviewed, not used)

---

## 23. Verified facts log (as of 2026-10-25)

Verified from the cited pages:
- Walrus Memory SDK surface, namespaces, delegates, plaintext relayer, no documented delete or cross-account sharing, `ask` undocumented (SDK API reference, core components).
- Mainnet has no public publisher; storing public blobs costs WAL and SUI; the public relayer abstracts funding (funding storage page). No explicit fee statement for the hosted relayer, confirm on day 1.
- Tatum free plan: 3 requests per second, 100,000 credits (plans and limits). Sui gateways exist for mainnet, testnet, devnet. Tatum docs list Sui JSON-RPC and Sui gRPC references.
- `@suimpp/mpp`: Sui USDC, gRPC verification, digest store, signed proof, x402 dialect, mainnet supported.
- The community x402 Sui facilitator is testnet only and unofficial; the x402 Sui network identifier was still being settled upstream.
- Hackathon dates, tracks, awards, checklist, judging weights and form fields (from the hackathon pages).

Not verified (do these on day 1, section 15):
- Tatum Sui authentication header and which API types answer with a free key; event queries through Tatum; Tatum gRPC as the `rpcUrl` for `@suimpp/mpp`.
- Two delegate keys sharing one namespace.
- Whether the hosted relayer is truly free and any rate limits.
- Whether the Agent Payments award requires mainnet, and exactly how memories are counted.
- Exact `@mysten/sui` signing and verification helper names.
- Exact Node minimum version for the memwal SDK.
