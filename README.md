# Fides

*Fides* is Latin for trust and good faith. It is a credit bureau for machine payments on Sui: before an agent pays a merchant it asks "should I pay this?", and gets a verdict backed by evidence that other agents signed and sealed after real payments. (Not the Ethyca privacy tool of the same name: this repo is `fides-sui`.)

**The hard problem is not remembering what happened. It is letting an agent that has never met a merchant act on what another agent learned, without having to trust that other agent's word.** Every report here is signed by the agent that paid, anchored on Sui by the same address, and checked again by every reader against the chain, so a forged or copied report is rejected and shown, never believed.

Built for the Walrus x Tatum "Total Recall" hackathon. [Judge in 2 minutes](#judge-in-2-minutes) · [The core proof](#the-core-proof) · [Honest limits](#honest-limits) · [Run it](#run-it)

## Status

Built and tested; runs on **Sui testnet**. The mainnet runs (real USDC, the 10+ mainnet Walrus Memory writes, the mainnet anchor) are **not done yet**: they wait on funding. The UI (decision feed, A/B split, merchant record with Re-verify, simulation board) is built and runs on **recorded fixtures** from the real engine; it is **not yet connected to live data** (a live API and demo server are still to do). A plain lookup page also ships with the registry. See [Honest limits](#honest-limits) and [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) for what is verified and what is not.

## Judge in 2 minutes

| | |
|---|---|
| Tests | 366 pass, 10 skipped (live network tests and two slow simulation tests, run on request), typecheck clean |
| UI | `pnpm web` opens the four screens (React, on recorded fixtures); `pnpm mockups` serves the static design mockups |
| Real on-chain run | the full demo on Sui testnet: real MPP USDC payments, Tatum verification, Sui anchors. Output: [`docs/evidence/demo-live-testnet.txt`](docs/evidence/demo-live-testnet.txt) |
| Measured result | 20 agents, 6 merchants (2 bad): **12 burns with the shared record, 44 without** (73% avoided), no good merchant refused. [`docs/evidence/simulation.txt`](docs/evidence/simulation.txt) |
| Anchor module (testnet) | package `0x1e58e339d2914686089424a956b34f22997d8cf5fac477f3604d05c027ae6b4a`, events of type `<package>::anchor::Report` |
| Not done | mainnet runs, the UI on live data, blog post and video |

```bash
pnpm install                 # Node 22 or newer, pnpm 11
pnpm test                    # 366 tests, no network, no keys
pnpm demo                    # the whole story, simulated: seconds, free
pnpm sim                     # 20 agents x 6 merchants, with and without the shared record
```

Real payments need keys and testnet funds: see [Run it](#run-it).

## The core proof

The scenario is the spec's demo, run on testnet with real payments. Agent A pays three merchants, then pays the flaky one again and gets junk. Agent C is burned too. Agent B has never met the flaky merchant, reads the shared record, and refuses. The malicious merchant swaps its payout address and quotes 4x. Then B loses access to the shared record, and is burned like the others. Then a real record is re-verified step by step and a forged one is rejected.

<details>
<summary>Verbatim output of the live testnet run (<code>pnpm demo:live</code>, memory kept in-process)</summary>

```text
Fides demo on testnet (live). Agents: A, B, C. Merchants: good, flaky, malicious.

== Step 1: Agent A, cold start, meets every merchant
  A -> good.fides-demo.test: ASK (cannot say: not enough history) [tier] -> person approves -> paid -> delivered as advertised -> reported clean 284dc881 (complete)
  A -> flaky.fides-demo.test: ASK (cannot say: not enough history) [tier] -> person approves -> paid -> delivered as advertised -> reported clean 9efed6a8 (complete)
  A -> malicious.fides-demo.test: ASK (cannot say: not enough history) [tier] -> person approves -> paid -> delivered as advertised -> reported clean faa83cb0 (complete)
  [ok] A asks about good and cannot say yet
  [ok] A pays good once and it delivers
  [ok] A asks about flaky and cannot say yet
  [ok] A pays flaky once and it delivers
  [ok] A asks about malicious and cannot say yet
  [ok] A pays malicious once and it delivers

== Step 2: A pays the flaky merchant again and gets junk
  A -> flaky.fides-demo.test: ASK (cannot say: not enough history) [tier] citing 9efed6a8 -> person approves -> paid -> BURNED (schema is "wrong/v0", expected fides.news/v1; data is missing or not an object) -> reported burn 5bcfb4d0 (complete)
  [ok] A is burned and reports a signed burn
  [ok] the burn is anchored on Sui and written to the shared record

== Step 3: C is burned too; B, who has never met flaky, reads the shared record and refuses
  C -> flaky.fides-demo.test: PAY_CAPPED [shared-burn] citing 5bcfb4d0 -> paid -> BURNED (asOf is 3600 s old, maximum is 120 s) -> reported burn 1c236e7c (complete)
  B -> flaky.fides-demo.test: REFUSE [shared-burns] citing 5bcfb4d0, 1c236e7c: not paid
  [ok] C is burned by the same merchant
  [ok] B refuses, citing both signed burns
  [ok] B pays nothing
  [ok] A's burn is one of the cited records

== Step 4: The malicious merchant swaps its payout address and quotes 4x
  A -> malicious.fides-demo.test: REFUSE (cannot say: not enough history) [address]: not paid
  B -> malicious.fides-demo.test: REFUSE (cannot say: not enough history) [address]: not paid
  [ok] A refuses: address changed from the one it paid, price jumped
  [ok] B refuses too, though it never paid this merchant: the pinned address comes from the shared record
  [ok] both raised an address alert

== Step 5: B detaches the shared memory: no access to it, nothing deleted
  B -> flaky.fides-demo.test: ASK (cannot say: not enough history) [tier] (shared record detached) -> person approves -> paid -> BURNED (schema is "wrong/v0", expected fides.news/v1; data is missing or not an object) -> reported burn aac63035 (complete)
  Detaching removes B's access to the shared record. Nothing was deleted from it.
  [ok] B no longer sees the burns: it can only ask a person
  [ok] B cites no shared records
  [ok] the person approves and B is burned: the same loss A and C had

== Step 6: Re-verify a real record, then reject a forged one
  re-verify format        ok   well formed, 1084 bytes, canonical
  re-verify hash          ok   sha256 9efed6a871e052df737248ecfbc25388039f7013db101892986f3b986dc7b4d5 matches the Sui anchor
  re-verify signature     ok   signed by reporter 0x1e27871ad624952bd034c7bb6b995f927ea494537603dc82b9fef6b537c6f4ec
  re-verify anchor-sender ok   anchor event sender equals the reporter
  re-verify payment       ok   final in checkpoint 400488473, sender is the reporter, 10000 paid to 0x6bb4c83392650cbd167bac4140ad7688a798a3c4347b0a21bf2d63a50de7071e
  forged record 9134818e: REJECTED, no anchor event found for this evidence (it may not be indexed yet)
  [ok] the anchor event for the record is found on Sui
  [ok] a real record passes every step of the re-verify
  [ok] the forged record is rejected and shown
  [ok] it changes nothing: B cites the same signed records and reaches the same decision

== Step 7: The shared record cannot be reached: B fails closed
  shared record unreachable: ASK [own-history] cites 1 record(s)
  [ok] while it is reachable B refuses flaky, citing the signed burns
  [ok] B is told the record is unreachable, not that there are no reports
  [ok] it will not pay: unreachable never softens a decision into a payment
  [ok] when the record comes back B refuses again, citing the same burns

== Cost of the burns (USDC)
  A: 0.01
  B: 0.01
  C: 0.01
  B lost nothing to flaky while attached (step 3), and lost the same as A and C once it detached (step 5).

All expectations met.
```

</details>

How to read it:

- **Step 3** is the point of the project. B pays nothing and cites two signed burns, by evidence id. One burn from another agent only *caps* a payment (that is what happened to C, who was burned anyway); a refusal takes two independent reporters.
- **Step 4**: B never paid the malicious merchant, yet it catches the address swap, because the address it compares with comes from verified clean reports in the shared record.
- **Step 5**: detaching means B loses access to the shared record (nothing is deleted). It has to ask a person, who approves, and B pays the same 0.01 USDC the others lost.
- **Step 6**: the "re-verify" lines are the checks any reader runs. The forged record (signed by a stranger, never anchored on Sui) is shown as rejected and changes nothing.
- **Step 7**: with the shared record unreachable B is told so, answers from its own history only, and will not pay. This step uses the in-process memory, so it shows the behaviour, not the real relayer failing.

And the measured effect, from the simulation (verbatim):

```text
Simulation: 20 agents, 6 merchants (4 good, 1 flaky, 1 malicious), 12 rounds, 3 seeds. Settlement simulated.

seed 1 shared   burns   5  paid 178  refused  51  asked  85
seed 1 detached burns  17  paid 192  refused   9  asked 231
seed 2 shared   burns   4  paid 173  refused  50  asked  91
seed 2 detached burns  14  paid 193  refused   8  asked 232
seed 3 shared   burns   3  paid 171  refused  53  asked  93
seed 3 detached burns  13  paid 184  refused  16  asked 224

                      with shared record   without
  burns                     12                44
  paid calls               522               569
  refused                  154                33
  ...of which good           0                 0   (the cost of caution)
  asked a person           269               687
  lost to burns (USDC)    0.12              0.44

The shared record avoided 32 of 44 burns (73%).

Rules that decided checks, with the record: tier 315, similar-incident 229, shared-burns 85, address 69, shared-burn 21, own-history 1
Rules that decided checks, without it:     tier 651, own-history 35, address 34
```

## The problem

Agents increasingly pay for things themselves: a server answers `402 Payment Required` with a price and an address, and the agent pays and retries. Three things go wrong. The merchant takes the money and returns junk. The merchant changes its payout address or raises its price. And every agent learns these lessons alone and loses money first: the knowledge dies with the agent.

## What was built

- **The guard:** a decision engine inside each agent. Before a payment it returns PAY, PAY_CAPPED, ASK (a person) or REFUSE, with reasons and citations.
- **The shared record:** after a payment the agent writes a signed, verified outcome to Walrus Memory and anchors its hash on Sui, so any other client can read and re-verify it.
- **Public surfaces:** an SDK, an MCP server (stdio and HTTP) and adapters for OpenAI, Anthropic, Gemini and OpenRouter, and a registry with a lookup page and a Re-verify button.
- **A test world:** three mock merchants (good, flaky, malicious), demo agents, and a simulation.

**The loop: check, pay, judge the response against what the merchant advertised, report, and the next agent to meet that merchant starts from what this one learned.**

## Architecture

```mermaid
flowchart LR
  subgraph AG["Agent (any model, or a script)"]
    L["agent loop"]
  end
  subgraph FC["Fides client (packages/sdk)"]
    S["check / report"]
    E["engine: 7 rules (core)"]
    DB["SQLite: caps, claims, pinned address (state)"]
    EV["signed evidence (evidence)"]
  end
  M["Merchant (402, MPP on Sui)"]
  MEM["Walrus Memory: shared record"]
  SUI["Sui: anchor module (Move)"]
  TAT["Tatum Sui gateway (GraphQL)"]
  REG["Registry + lookup page"]
  L -->|fides_check, fides_report| S
  S --> E
  S --> DB
  S --> EV
  L <-->|pay USDC, paid request| M
  S <-->|recall, remember| MEM
  S -->|anchor sha256| SUI
  S -->|payment, finality, anchor events| TAT
  REG --> MEM
  REG --> TAT
```

Trust boundaries worth knowing: Walrus Memory is untrusted storage (any delegate can write anything), so every recalled report is checked against Sui (its anchor, written by the reporter) and Tatum (the payment, final, from the reporter, to the merchant) before it counts. Merchants verify payments through the MPP package's default fullnode, because Tatum's gRPC host cannot be used with it (see limits).

| Path | Role |
|---|---|
| `packages/core` | the engine: seven decision rules, trust scoring (Wilson interval, decay, reporter weights), config |
| `packages/evidence` | canonical JSON, signing, and the five-step verification (format, hash, signature, anchor sender, payment) |
| `packages/state` | SQLite via `node:sqlite`: atomic claims, daily cap, pinned address, evidence index, content-addressed copies, unreported-payment queue |
| `packages/memory` | the Walrus Memory wrapper: write rule, exact-host post-filtering, attached / detached / unreachable |
| `packages/chain` | Tatum GraphQL client (rate limited), payment and finality facts, anchor event reads |
| `packages/move` | the anchor Move module and publish script |
| `packages/sdk` | `fides.check`, `fides.report`, `lookup`, response checking, the simulated test world |
| `packages/tools`, `packages/mcp` | the three tools once, as MCP (stdio, HTTP) and as OpenAI / Anthropic / Gemini / OpenRouter adapters |
| `apps/merchants` | the good, flaky and malicious mock merchants (real HTTP, real MPP) |
| `apps/agent` | the paying agent loop and the scripted demo |
| `apps/sim` | the simulation |
| `apps/registry` | the read-only verifying registry and the lookup page |
| `apps/web` | the UI: Vite, React and TypeScript behind a `FidesApi` interface (fixtures implemented, live not yet), plus the static mockups |

## How it decides

First matching rule wins, in this order:

1. **Budget:** today's spend plus this payment over the daily cap: ASK.
2. **Address:** the payout address differs from the pinned one: REFUSE if the price also jumped, otherwise ASK, and raise an alert.
3. **Price spike:** above 3x (new), 2x (established) or 1.5x (trusted) the typical price: ASK.
4. **Shared record:** two or more independent reporters with verified burns: REFUSE. One: PAY_CAPPED up to 0.05, or ASK above it.
5. **Own history:** burned by this merchant before: ASK once, REFUSE after two.
6. **Similar incidents:** recalled burn narratives of *other* merchants whose pattern matches this one: ASK, citing the memories.
7. **Tier:** established or trusted: PAY. New or unknown: ASK.

| Situation | Outcome |
|---|---|
| Too little history | ASK with `cannotSay: true`. Never a guess |
| Shared record unreachable | Other agents' reports are hidden and any PAY becomes ASK. It never softens a REFUSE |
| Shared record detached (the demo toggle) | Own reports only. Nothing is deleted |
| A shared report cannot be checked yet (Tatum down) | pending: not counted, not rejected, and a PAY becomes ASK |
| A shared report fails any check | shown as rejected with the reason, never counted |

Trust tiers come from verified outcomes, weighted by the reporter's own track record, decayed (14 day half-life, 30 day window), with one reporter's influence capped. Starting values are in [`packages/core/src/config.ts`](packages/core/src/config.ts) and are not yet calibrated: see limits.

## Tests

| Package | Tests | What they pin down |
|---|---|---|
| `core` | 59 | every rule, cannot-say, fail-closed states, Wilson, weights, decay, caps, clock skew |
| `evidence` | 29 | canonical form, signature, forged and tampered records, a copied payment digest, a failed lookup |
| `state` | 16 | atomic claims across connections, idempotency, the pinned address, rejections kept visible |
| `memory` | 28 | the write rule, exact-host filtering, look-alike hosts, header/evidence mismatch, the three states |
| `chain` | 35 | rate limiting and retries, key never in a URL or error, injection refused, finality, anchor paging |
| `sdk` | 71 | the whole check/report loop, forgeries, pending vs rejected, partial failures and retries, rule 6 end to end |
| `tools`, `mcp` | 37 | the three tools, every vendor's tool shapes, MCP over memory, stdio and HTTP, auth and origin checks, rate limit and deadline |
| `merchants` | 26 | each merchant's behaviour, the address swap on the real MPP gate |
| `agent` | 18 | the buy loop, timeouts, refused and unknown payments, a merchant naming another host, reporting retries, the full demo |
| `registry` | 28 | verification, forged records, tampered storage, outages, rate limits, page safety |
| `sim` | 4 | repeatability, and (on request) the result |
| `web` | 25 | the UI's logic and its API on fixtures: attempts, the board per round, the split view's three states, Re-verify, a forged record |
| **Total** | **376** | 366 run by default |

Live tests (a real relayer, Tatum testnet, real payments) run only with `FIDES_LIVE=1`. Everything else uses a simulated world: a fake ledger, in-process memory, real signatures, real HTTP between agents and merchants, the real engine. The headline demo and the live tests use real payments and a real chain; nothing in them is faked except where stated under [staged versus real](#staged-versus-real).

## Engineering decisions

- **Hash the fetched bytes, never a re-serialised object.** Records must already be canonical JSON, so what was signed is unambiguous. Pretty-printed or reordered bytes are rejected.
- **One payment counts once, and is as old as the payment.** A reporter who re-signs the same payment gets a duplicate that is rejected and shown. A report is dated by the earlier of its signed time and the payment's chain time, so an old payment cannot be passed off as fresh.
- **The reporter signs, and the anchor must come from the same address.** A copied payment digest in someone else's report fails because the payment's sender is not the reporter.
- **Fail loudly.** A failed lookup is an error or a pending state, never "no ratings". An unreachable shared record is a different state from an empty one.
- **Nobody can change the anchor's code.** The publish transaction hands the upgrade capability straight to Sui's `make_immutable`, so no key, including the agent key that publishes, can upgrade the module later. (The testnet package predates this and is still upgradeable by Agent A.)
- **The write rule.** Evidence is written only for a payment verified through Tatum and past finality. The anchor goes before the memory, so a reader never sees a memory it cannot check.
- **Exact state is local, meaning is shared.** Caps, claims and pinned addresses live in SQLite (atomic, `BEGIN IMMEDIATE`). Walrus Memory is fuzzy recall, so results are post-filtered by exact merchant host in code.
- **Tatum GraphQL, not JSON-RPC or gRPC.** The gateway serves GraphQL and gRPC only, and gRPC speaks plain gRPC where the MPP package speaks gRPC-web, so merchants verify through the default fullnode and Tatum verifies on the agent side.
- **A new agent inherits the pinned address and typical price from verified shared reports,** so it can catch an address swap at a merchant it has never paid.
- **`node:sqlite` over `better-sqlite3`:** no native build, which pnpm 11 blocks by default.
- **One set of tools, many routes.** MCP and the vendor adapters share one definition, so every model sees the same inputs and behaviour.

## Staged versus real

Read this before trusting any number.

- **The merchants are ours.** The good, flaky and malicious merchants are mock servers we wrote. The flaky failures are forced in the demo (junk, then stale), and the malicious merchant's address swap is triggered on demand through an admin endpoint. The payments to them, the verification, the anchors and the reports around them are real on testnet.
- **The demo's memory is in-process by default.** `pnpm demo:live` uses a real chain but keeps the shared memory in the process, so rehearsals do not write permanent memories. Walrus Memory itself was exercised separately on the mainnet relayer (writes, recall across two delegate keys, a forged record), in a throwaway namespace.
- **The person who approves an ASK is a script** that says yes. The simulation's person says yes 80% of the time.
- **The simulation settles on a fake ledger** and its memory is in-process. It cannot say how rule 6 behaves on real embeddings.
- **Three agents, not two,** because a refusal needs two independent reporters.
- **Testnet, not mainnet.** Nothing here has settled real money yet.

## Honest limits

- **Mainnet is not run yet.** The payment, the anchor and the 10+ Walrus Memory writes on mainnet need funding. Scripted: `pnpm day1:mainnet` checks and spends nothing, `pnpm day1:mainnet:run` spends cents. The Walrus Memory writes so far on mainnet are test records in a throwaway namespace.
- **Proof of payment is not proof of bad service.** A payment shows money moved, not that the response was bad. A merchant can pay itself through its own agents to build clean reports (it costs gas), and an honest-looking agent can slander a merchant by paying and reporting a false burn. Mitigations: reporter weighting, a cap on one reporter's influence, two reporters for a refusal, response checks against the published schema. A burn counts against a merchant only if the reporter paid that merchant's pinned payout address, so a reporter cannot pay a wallet of its own and blame any host for the price of gas; the payout address inherited from the shared record is the one most independent reporters paid. Sybil and cluster detection is out of scope.
- **Merchant identity is the host the agent called.** The reference agent refuses a merchant whose schema names a different host than the URL, except on loopback, where the local mock merchants name themselves. An agent that reaches merchants through some other path must do the same check.
- **A payment that fails in an unknown way keeps its spend.** If the payment call fails without proof that nothing was sent (a timeout after broadcast), the claim is marked unknown and still counts toward the daily cap. Reconciling it against the chain is manual for now: `fides.unknownPayments()` lists them, a later report settles one as paid, `release()` as failed.
- **Trust is slow.** With the spec's thresholds a merchant needs several independent, experienced reporters to reach "established". In the simulation that happened (93 automatic payments to good merchants in one seed, none without the record) but only at 20 agents; at 12 agents and 8 rounds it did not, and the three-agent demo never reaches it. Thresholds are not calibrated: easing them in the simulation raised automatic payments to good merchants from 273 to 389 and cut how often a person was asked from 269 to 115, for one more burn (13 against 12), over three seeds ([`docs/evidence/sweep.txt`](docs/evidence/sweep.txt)). That is a trade-off for the owner to choose, not a free win, and the simulation's honest reporters make the easier setting look safer than it is.
- **Similar-incident recall (rule 6) is unproven on real embeddings.** It is tested end to end with fake distances, and the simulation shows it changes nothing measurable. The provisional recall cutoff (0.45) rests on two real reports.
- **Recall is fuzzy and the registry can be incomplete.** It asks for up to 50 memories by meaning and filters by host. Sui's anchor events are the exact index; the registry does not enumerate them by merchant.
- **Merchants verify through the default fullnode,** not Tatum, and Tatum's JSON-RPC is not served. Tatum is on the agent and registry side of verification.
- **A merchant that is malicious from its first response, to an agent with no shared reports, is not flagged by the address rule.**
- **What still gets through:** in the simulation, 12 burns remain with the record, partly the malicious merchant after its turn, when a person approves an ASK about the changed address.
- **The model adapters (OpenAI, Anthropic, Gemini, OpenRouter) are checked against the vendors' documentation, not against live APIs.** The MCP server is verified with a real MCP client. There is no TLS in front of the HTTP MCP server; put one there.
- **The Walrus Memory relayer sees plaintext** (it encrypts with Seal after reading). Nothing private is stored: evidence is public by design. There is no documented delete, so "detach" means Fides stops using the record. The testnet staging relayer's certificate is broken (checked 2026-10-28).
- **The UI is not connected to live data yet.** Its pages run on fixtures recorded from the engine, and a label in the header says so on every page. The React components are tested only through their data layer, not rendered in a test; they were checked by hand in a browser.
- **Not built:** the mainnet runs, a live API for the UI, self-grading of verdicts.

More detail, with how each was measured, in [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) and [`docs/DAY1.md`](docs/DAY1.md).

## Tech stack

- **Chain and data:** Sui (testnet verified), Move 2024 anchor module, Tatum Sui gateway (GraphQL), Walrus Memory (`@mysten-incubation/memwal` 0.1.9), `@mysten/sui` 2.37.0.
- **Payments:** MPP on Sui USDC via `@suimpp/mpp` 0.9.0 and `mppx` 0.4.12.
- **Runtime and checks:** Node 22 or newer (developed on 24.15), TypeScript 5.9.3, pnpm 11.21, Vitest 2.1.9, `tsx` 4.23.15, `node:sqlite`.
- **Model access:** `@modelcontextprotocol/sdk` 1.32.2, `zod` 4.x.

## Project layout

```text
packages/
  core/        engine and trust scoring
  evidence/    canonical JSON, signing, verification
  state/       SQLite state
  memory/      Walrus Memory wrapper
  chain/       Tatum client, network profiles (networks.json)
  move/        anchor.move, publish.mjs, deployments.json
  sdk/         fides.check / fides.report, simulated world
  tools/       the three tools and the vendor adapters
  mcp/         MCP server (stdio, HTTP)
apps/
  merchants/   mock merchants    agent/   paying agent and demo
  sim/         simulation        registry/   verifying registry and lookup page
  web/         the UI (src/), fixtures/, mockups/
scripts/       day1-mainnet.mjs, check-secrets.mjs
docs/          SPEC-adjacent notes: DAY1, ASSUMPTIONS, INTEGRATIONS, evidence/
SPEC.md        the build spec
```

## Run it

```bash
pnpm install
cp .env.example .env              # names only; fill in locally. Never commit .env
pnpm test && pnpm typecheck

pnpm demo                         # simulated, no keys
pnpm sim                          # the simulation (pnpm sim -- --seeds=5)
pnpm merchants                    # the three mock merchants on 127.0.0.1:4101-4103
pnpm web                          # the UI on http://127.0.0.1:4500 (recorded fixtures)
pnpm registry                     # lookup page and API on http://127.0.0.1:4200
pnpm --filter @fides/mcp start    # MCP over stdio (add -- --http, with FIDES_MCP_TOKEN, for HTTP)
```

For a real run you need, in `.env`: `FIDES_DAILY_CAP_USD`, `SUI_PRIVATE_KEY_A` / `_B` / `_C` / `_MERCHANTS`, `TATUM_TESTNET_API_KEY` (and `TATUM_MAINNET_API_KEY`), and for the real shared memory `MEMWAL_ACCOUNT_ID` and `MEMWAL_KEY_A` / `_B`. `packages/evidence/gen-wallets.mjs` generates wallet keys. `FIDES_LOG=json` adds structured logs on stderr, one JSON object per line, for payments, claims, reports, retries and rejected evidence. Then:

```bash
pnpm demo:live                          # real testnet payments, memory in-process
pnpm demo:live -- --memory=live         # also writes real Walrus Memory (permanent)
pnpm day1:mainnet                       # mainnet preflight: spends nothing, says what is missing
```

Using Fides from OpenAI, Claude, Gemini or OpenRouter: [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Attribution

- Walrus Memory ([`@mysten-incubation/memwal`](https://www.npmjs.com/package/@mysten-incubation/memwal)), Walrus and Sui by Mysten Labs.
- Tatum's Sui gateway ([docs.tatum.io](https://docs.tatum.io)).
- MPP on Sui: [`@suimpp/mpp`](https://www.npmjs.com/package/@suimpp/mpp) and [`mppx`](https://www.npmjs.com/package/mppx).
- [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk), [`zod`](https://www.npmjs.com/package/zod), [Vitest](https://vitest.dev), [`tsx`](https://www.npmjs.com/package/tsx).
- **Built with an AI coding agent.** Claude Code (Claude Sonnet 5.5) wrote most of the code and tests in this repository, working from `SPEC.md` and the author's direction. The design, the decisions, the funding and all on-chain actions were the author's to approve.

## License

Not chosen yet.
