# Fides

A credit bureau for machine payments on Sui, built for the Walrus x Tatum "Total Recall" hackathon. Deadline: **Nov 10 2026, 17:00 UTC**. Core freeze: **Nov 6**.

**Read `SPEC.md` fully before doing anything.** It is the source of truth for scope, architecture, decision rules, evidence format, UI, schedule and definition of done. Section 22 has the documentation links, section 23 lists what is verified and what is not.

## Working rules

1. **Verify before you build on it.** Anything marked UNVERIFIED in `SPEC.md` must be checked against the linked official docs and the result recorded in `docs/DAY1.md`. Do not guess APIs. If something does not work, write down what you tried and take the fallback from the spec.
2. **Start with the day 1 to 2 checks** (SPEC section 15). Do not start the engine before they are written up.
3. **Memory split.** Exact and atomic state lives in SQLite. Walrus Memory holds narrative, similar-incident recall and the shared record. Recall is fuzzy: always post-filter by exact merchant host, never use recall as a keyed lookup.
4. **Shared record** uses one shared Fides Registry Walrus Memory account with a delegate key per agent. Cross-account sharing is not documented, do not rely on it.
5. **Write rule.** Write a memory or evidence record only for a payment verified through Tatum and past finality.
6. **Evidence must be signed** by the reporter, anchored on Sui with a matching sender, and verified at read time (SPEC section 8). Hash the fetched bytes, never a re-serialised object. Canonical JSON, no floats.
7. **Fail loudly.** A failed lookup is an error, never "no ratings". Unreachable shared record means ASK. Too little history means "cannot say", never a guess.
8. **"Delete the memory" in the demo means detach.** No delete API is documented. Never claim data was deleted.
9. **Stay in scope.** Do not build anything in SPEC section 18. If something feels necessary, stop and ask.
10. **UI is a priority.** Polished, expressive, not a default crypto dashboard. Build it against the `FidesApi` fixtures interface so it never blocks the engine.
11. **Tests.** Unit tests for every decision rule, the cannot-say case, atomic claims and the forgery cases. Keep them fast.
12. **Secrets.** Never commit keys. Use `.env` with an `.env.example` listing names only. Small test wallet only. Expected spend is a few dollars.
13. **Rate limits.** Tatum's free plan is 3 requests per second. Cache and batch. No polling loops.
14. **Windows machine.** Keep scripts cross-platform. Prefer Node scripts over bash-only ones.
15. **Keep a log.** Update `docs/ASSUMPTIONS.md` whenever you rely on something unverified. Make small, descriptive commits.
16. **Honesty in docs.** The README states what is verified, what is not, and the honest limits (SPEC section 20). No claims the code does not back.

## Style

No em dashes in docs or user-facing copy. Direct, plain language.

## Commands

```bash
pnpm install
pnpm test                        # all tests, no network, no keys (live tests need FIDES_LIVE=1, slow ones FIDES_SLOW=1)
pnpm typecheck                   # tsc -b over every package and app
pnpm check:secrets               # scan staged files for key-like strings (check:secrets:all scans every tracked file, as CI does)

pnpm merchants                   # the three mock merchants on 127.0.0.1:4101-4103
pnpm demo                        # the scripted demo, simulated, no network
pnpm demo:live                   # the same on Sui testnet with real payments (-- --memory=live writes real memories)
pnpm research                    # the research agent (the hackathon application): five sessions, simulated; -- --live --memory=live on mainnet, --json=path saves the run for the UI
pnpm demo:rule6                  # rule 6 shown once: a PAY becomes an ASK citing another merchant's memory (-- --live --memory=live for mainnet)
node scripts/balances.mjs        # SUI and USDC per wallet, read-only
pnpm sim                         # the simulation (-- --seeds=5 --agents=20 --rounds=12 --no-rule6)
pnpm registry                    # verifying registry and lookup page on 127.0.0.1:4200 (-- --memory=fake for an empty record)
pnpm --filter @fides/mcp start   # MCP over stdio (-- --http with FIDES_MCP_TOKEN for HTTP)

pnpm day1:mainnet                # mainnet preflight, spends nothing
pnpm day1:mainnet:run            # spends cents: one MPP payment and one anchor publish on mainnet
```

```bash
pnpm web                         # the UI (React and Vite) on fixtures; pnpm web:build builds it, pnpm web:build:hosted builds what the hosted site shows (the recorded mainnet run)
pnpm web:live                    # the UI on a fresh engine run (-- --live for Sui testnet)
pnpm mockups                     # the four early UI mockups on http://127.0.0.1:4400/ (open /mockups/index.html)
pnpm fixtures                    # re-export the real demo and simulation data the mockups read (apps/web/fixtures)
```

Run a single package's tests with `node node_modules/vitest/vitest.mjs run packages/core`. `apps/web` holds the UI: a React app (landing page, decision feed and detail, A/B split, merchants, evidence with Re-verify, simulation) built against the `FidesApi` interface and running on recorded fixtures from the real engine. `pnpm web:live` runs the engine first and serves that run to it through `apps/web/server` (Re-verify checks for real). The static mockups in `apps/web/mockups` came first and are kept for reference.

Where things are: the engine is `packages/core`, the loop is `packages/sdk` (`fides.check` and `fides.report`), the network is picked by `FIDES_NETWORK` through `packages/chain/networks.json`. `docs/ASSUMPTIONS.md` is the log of what is verified and what is not: update it whenever something unverified is relied on.
