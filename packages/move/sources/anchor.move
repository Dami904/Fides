/// Fides evidence anchor.
/// Emits one event per report. The chain records the transaction sender, which readers
/// compare with `reporter.suiAddress` in the signed evidence (SPEC section 8).
module fides_anchor::anchor;

use std::string::String;
use sui::event;

const E_BAD_HASH_LENGTH: u64 = 1;
const E_BAD_VERDICT: u64 = 2;

/// 0 = clean, 1 = burned.
const VERDICT_BURNED: u8 = 1;

public struct Report has copy, drop {
    merchant: String,
    evidence_sha256: vector<u8>,
    pay_tx_digest: vector<u8>,
    verdict: u8,
}

public fun report(
    merchant: String,
    evidence_sha256: vector<u8>,
    pay_tx_digest: vector<u8>,
    verdict: u8,
) {
    assert!(evidence_sha256.length() == 32, E_BAD_HASH_LENGTH);
    assert!(verdict <= VERDICT_BURNED, E_BAD_VERDICT);
    event::emit(Report { merchant, evidence_sha256, pay_tx_digest, verdict });
}
