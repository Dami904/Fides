# Day 1 checks

Results of SPEC section 15. Record what was tried, what happened, and the fallback taken.

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Walrus Memory write and recall on mainnet | todo | |
| 2 | Two delegate keys, one account, shared namespace | todo | |
| 3 | Tatum Sui: auth, JSON-RPC vs gRPC, event queries, `rpcUrl` for `@suimpp/mpp` | todo | |
| 4 | End-to-end MPP payment on Sui mainnet | todo | |
| 5 | Publish Move anchor, emit event, read back via Tatum | todo | |
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

## Check 7: hackathon rules (2026-10-26, https://recall-tatum-walrus.vercel.app/)

- Agent Payments award text: "x402 or MPP, settled on Sui". It does not say mainnet or testnet. Only the Walrus Memory writes are stated as Mainnet. Decision: settle on mainnet anyway (cents), so the answer does not matter.
- "10 memories": the FAQ says "10+ writes". The unit is not defined (each `remember`, each analyzed fact, per account). Decision: produce well over 10 separate `remember` writes from real runs, and ask in Discord office hours.
- Form needs the Tatum account ID and `MEMWAL_AGENT_ID`.
- The Event Rules page content was not shown by the fetch. Read it by hand before submitting.

## Tooling (2026-10-26)

- Local machine: Node 24.15.0, pnpm 11.21.0 (not 22 and 10.28 as noted above). `pnpm install` finished; it took about 3 minutes because the npm registry was slow. pnpm 11 reports `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.21.5` and exits 1. Vitest runs without the esbuild build script (it only validates the binary), so `allowBuilds.esbuild` is set to `false` in `pnpm-workspace.yaml`. Without that, pnpm 11's dependency status check made `pnpm test` fail.

## Blocked (2026-10-25)

Checks 1 to 5 and 7 are blocked: the container's network policy denies `docs.tatum.io`, `tatum.io`, `*.gateway.tatum.io`, `*.walrus.xyz`, `docs.wal.app`, `fullnode.mainnet.sui.io` and the hackathon rules site (retried twice, still 403 on CONNECT). Needs the environment's Network access widened. Checks 1 to 5 also need keys and a funded wallet.
