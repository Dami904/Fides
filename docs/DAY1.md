# Day 1 checks

Results of SPEC section 15. Record what was tried, what happened, and the fallback taken.

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Walrus Memory write and recall on mainnet | done | See "Check 1" below. |
| 2 | Two delegate keys, one account, shared namespace | done | See "Check 2" below. Shared registry design confirmed. |
| 3 | Tatum Sui: auth, JSON-RPC vs gRPC, event queries, `rpcUrl` for `@suimpp/mpp` | partial | See "Check 3" below. `rpcUrl` for `@suimpp/mpp` is tested in check 4. |
| 4 | End-to-end MPP payment on Sui mainnet | todo | |
| 5 | Publish Move anchor, emit event, read back via Tatum | testnet done | See "Check 5" below. Mainnet publish still to do. |
| 6 | Sign and verify an evidence record | done | Offline. See below. Run: `node packages/evidence/day1-check6-signing.mjs` |
| 7 | Hackathon rules: mainnet for Agent Payments award, how memories are counted | partial | See "Check 7" below. The linked Event Rules page was not readable. |
| 8 | Fund a small test wallet | todo | |

## Findings without credentials (2026-10-25, npm registry)

- `@mysten-incubation/memwal` 0.1.9: engines node `>=20.0.0`. Peer deps: `@mysten/sui >=2.5.0`, `@mysten/seal >=1.1.0`, `@mysten/walrus >=1.0.3`, `ai >=4`, `zod ^3.23 || ^4`. Resolves the "exact Node minimum" item (the registry says 20; `@mysten/sui` itself needs 22, so we use 22).
- `@suimpp/mpp` 0.9.0 is published on npm.
- `@mysten/sui` 2.37.0, engines node `>=22`.
- Dev environment: Node 22.22.0, pnpm 10.28.0.

## Check 6: signing (2026-10-25, offline, `@mysten/sui` 2.37.0)

- Sign: `keypair.signPersonalMessage(bytes)` from `@mysten/sui/keypairs/ed25519` returns `{ signature }` (base64 serialized signature).
- Verify: `verifyPersonalMessageSignature(bytes, signature)` from `@mysten/sui/verify` returns the signer's public key. Compare `publicKey.toSuiAddress()` to `reporter.suiAddress`. It throws "Signature is not valid for the provided message" on a tampered body.
- Results: valid record verifies and the signer matches the reporter; a tampered body is rejected (throws); a record signed by a different key verifies but the signer does NOT match `reporter.suiAddress`, so the address comparison is mandatory.
- Canonical JSON (sorted keys, no whitespace, floats rejected) and sha256 of the canonical bytes worked as in SPEC section 8.

## Check 1: Walrus Memory write and recall (2026-10-28, mainnet relayer)

- Done through the MemWal Claude Code plugin (`memwal-mcp` 0.0.16), not the SDK directly. Login is a browser wallet approval of an on-chain `add_delegate_key`; credentials land in `~/.memwal/credentials.json`.
- `health`: status ok, relayer version 0.1.0, `write_ready=true`, relayer `https://relayer.memory.walrus.xyz`.
- Write: `remember` returned ACCEPTED with a job id, not stored yet. The status call reported it saved after under 45 s, with a blob id, in namespace `fides-day1`. So a write is two steps (queue, then wait), as SPEC section 5 says.
- Recall right after: the record came back, distance 0.320 for a loosely worded query. No fee was charged to us beyond the wallet approval gas. No rate limit hit in one write.
- Not yet tested: the SDK path (`MemWal.create` with a hex delegate key), which the engine will use. This account is the one the plugin logged into, `MEMWAL_ACCOUNT_ID` in `.env` is set to it.

## Check 2: two delegate keys, one account (2026-10-28, SDK `@mysten-incubation/memwal` 0.1.9)

- Scripts: `packages/memory/day1-check2-delegates.mjs` (which keys the relayer accepts) and `packages/memory/day1-check2-share.mjs` (write with A, recall with B).
- Two different delegate keys are accepted by the relayer on the one account: the plugin's login key and `WALRUS_PRIVATE_KEY`. `WEBAPP_DELEGATE_KEY` is rejected with a 401 (not registered on this account, or wrong account). In `.env`, `MEMWAL_KEY_A` is the plugin's delegate key and `MEMWAL_KEY_B` is `WALRUS_PRIVATE_KEY`.
- Result: key A wrote a record in namespace `fides-day1` (queued in about 4 s, stored after about 35 s). Key B, a different key, recalled it in the same namespace on the first query (distance 0.33). So the shared Fides Registry design from SPEC section 5 works: one account, a delegate key per agent, one shared recall space.
- Timing for the engine: a write takes tens of seconds to land, so `report()` must wait for the job and must not block the payment path.
- Still open: these keys are reused from other setups. Before the demo, create dedicated delegate keys for the agents with `addDelegateKey` (needs the account owner wallet), and use a fresh account and a `merchants` namespace for the registry.

## Check 3: Tatum Sui mainnet (2026-10-28, free mainnet key)

- Auth per docs: `x-api-key` request header (also accepted: Bearer, Basic, `?xApiKey=`, path; the header is checked first). Each free account has one mainnet and one testnet key. We only use the mainnet key, named `TATUM_MAINNET_API_KEY` in `.env` (the check script also accepts `TATUM_API_KEY`).
- **The docs page and the live gateway disagree.** The docs list Sui JSON-RPC (`sui_*`, `suix_queryEvents`). The live host `https://sui-mainnet.gateway.tatum.io` answers JSON-RPC POSTs with 404 on every path and auth variant I tried. Its own `/_methods` and `/llms.txt` list one interface: **GraphQL** at `https://sui-mainnet.gateway.tatum.io/graphql` (one operation per POST, no batching, no subscriptions; queries and mutations billed separately). Consistent with Sui retiring JSON-RPC.
- **GraphQL works on mainnet and covers what Fides needs:**
  - latest checkpoint: `{ checkpoint { sequenceNumber digest timestamp } }` returned the current checkpoint.
  - event reads: `events(first, filter: { sender })` returns events with `transaction.digest`, `sender.address` and `contents.json`. A filter on `type: "0x2::coin"` returned nothing, so type filters need a full event type; test with our own module once the anchor is published (check 5).
  - transaction and finality: `transaction(digest) { sender effects { status checkpoint { sequenceNumber } balanceChanges { nodes { owner { address } amount coinType { repr } } } } }` returns sender, status, checkpoint and balance changes. That is enough for SPEC section 8 check 4 (exists, final, sender, amount, recipient).
- **gRPC** host `https://sui-mainnet-grpc.gateway.tatum.io` answers `sui.rpc.v2.LedgerService/GetServiceInfo` over HTTP/2 (grpc-status 0, 123 bytes). Not yet used for anything else.
- **Observed: the gateway did not reject requests without a key** (GraphQL checkpoint and gRPC GetServiceInfo both answered with no key). Do not rely on that: it may be anonymous throttling, and the hackathon requires Tatum to be used with our key. Always send `x-api-key`.
- Decision: read path is **GraphQL** through Tatum. SPEC section 8 said to prefer gRPC; the spec's fallback applies in part: events and finality come from Tatum GraphQL, gRPC stays an option for `@suimpp/mpp` verification (check 4). `.env` now has `TATUM_SUI_RPC_URL` pointing at the GraphQL URL (name kept from the spec) and `TATUM_SUI_GRPC_URL` at the gRPC host.
- Rate limit: all probes were spaced at least 450 ms apart. Script: `packages/chain/day1-check3-tatum.mjs` (its JSON-RPC probes return 404, kept as the record of that finding).

## Check 5: Move anchor on testnet (2026-10-28)

- Module `packages/move/sources/anchor.move`: `report(merchant, evidence_sha256, pay_tx_digest, verdict)` emits `Report`. It aborts if the hash is not 32 bytes or the verdict is above 1. Compiles with Sui CLI 1.83.0 (downloaded from the MystenLabs GitHub release, 242.9 MB, kept in `~/.tools/sui-cli`, outside the repo).
- Side effect to know about: the CLI creates its own default wallet in `~/.sui` on first run. We do not use it. Project keys stay in `.env` and are never imported into the CLI.
- Publish and report are done by `packages/move/publish.mjs <testnet|mainnet>` with `@mysten/sui` 2.37 (`SuiGrpcClient`, `Transaction.publish`), signed by Agent A. The CLI is only used to compile. Testnet funds came from the CLI faucet command (1 SUI each to Agent A and the merchants wallet); the plain REST faucet URL I tried first returned 404.
- Testnet results: package `0x1e58e339d2914686089424a956b34f22997d8cf5fac477f3604d05c027ae6b4a`, publish tx `72qRj4ceSoYzVpyp7MMjuFvDUPcHKD3oC52a2yZEFQRC`, test report tx `FPK8RHuG1y6AbWnwUTSYymV6M98WT8HLpRkNUBBdoWho`.
- Read back through Tatum's **testnet** GraphQL with the testnet key, on the first try: `events(filter: { type: "<pkg>::anchor::Report" })` returned the event with `sender.address` equal to the publisher, and `contents.json` with the merchant string, the verdict, and the two `vector<u8>` fields **as base64** (the sha256 `cd33dc91...` came back as `zTPckTXz...`). Readers must base64-decode before comparing with the hex digest. `transaction(digest)` returned SUCCESS with a checkpoint.
- So the full-type filter works (a bare `0x2::coin` filter did not, see check 3). The event query is the exact, public index the spec wants.
- Still to do: publish on mainnet (`node packages/move/publish.mjs mainnet`, needs about 0.1 SUI in Agent A's mainnet wallet) and update the package ID for `FIDES_NETWORK=mainnet`.

## Check 7: hackathon rules (2026-10-26, https://recall-tatum-walrus.vercel.app/)

- Agent Payments award text: "x402 or MPP, settled on Sui". It does not say mainnet or testnet. Only the Walrus Memory writes are stated as Mainnet. Decision: settle on mainnet anyway (cents), so the answer does not matter.
- "10 memories": the FAQ says "10+ writes". The unit is not defined (each `remember`, each analyzed fact, per account). Decision: produce well over 10 separate `remember` writes from real runs, and ask in Discord office hours.
- Form needs the Tatum account ID and `MEMWAL_AGENT_ID`.
- The Event Rules page content was not shown by the fetch. Read it by hand before submitting.

## Tooling (2026-10-26)

- Local machine: Node 24.15.0, pnpm 11.21.0 (not 22 and 10.28 as noted above). `pnpm install` finished; it took about 3 minutes because the npm registry was slow. pnpm 11 reports `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.21.5` and exits 1. Vitest runs without the esbuild build script (it only validates the binary), so `allowBuilds.esbuild` is set to `false` in `pnpm-workspace.yaml`. Without that, pnpm 11's dependency status check made `pnpm test` fail.

## Blocked (2026-10-25)

Checks 1 to 5 and 7 are blocked: the container's network policy denies `docs.tatum.io`, `tatum.io`, `*.gateway.tatum.io`, `*.walrus.xyz`, `docs.wal.app`, `fullnode.mainnet.sui.io` and the hackathon rules site (retried twice, still 403 on CONNECT). Needs the environment's Network access widened. Checks 1 to 5 also need keys and a funded wallet.
