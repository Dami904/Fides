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
| 7 | Hackathon rules: mainnet for Agent Payments award, how memories are counted | todo | |
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

## Blocked (2026-10-25)

Checks 1 to 5 and 7 are blocked: the container's network policy denies `docs.tatum.io`, `tatum.io`, `*.gateway.tatum.io`, `*.walrus.xyz`, `docs.wal.app`, `fullnode.mainnet.sui.io` and the hackathon rules site (retried twice, still 403 on CONNECT). Needs the environment's Network access widened. Checks 1 to 5 also need keys and a funded wallet.
