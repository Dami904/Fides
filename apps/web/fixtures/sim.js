window.FIDES_SIM = {
  "generatedAt": "2026-11-04T17:08:42.090Z",
  "seed": 1,
  "shared": {
    "config": {
      "agents": 20,
      "rounds": 12,
      "seed": 1,
      "mode": "shared",
      "pApprove": 0.8,
      "turnAtRound": 6,
      "flakyRate": 0.4,
      "maxLatencyMs": 400,
      "lateMs": 1500
    },
    "burns": 2,
    "paid": 174,
    "refused": 54,
    "refusedGood": 0,
    "asked": 88,
    "lostRaw": "20000",
    "burnsByMerchant": {
      "flaky1.fides-sim.test": 2
    },
    "rules": {
      "tier": 95,
      "similar-incident": 87,
      "shared-burn": 4,
      "shared-burns": 38,
      "address": 16
    },
    "events": [
      {
        "round": 1,
        "agent": "agent10",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 1,
        "agent": "agent14",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent15",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent5",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "PAY_CAPPED",
        "tier": "new",
        "rules": [
          "shared-burn"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent13",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent16",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "PAY_CAPPED",
        "tier": "new",
        "rules": [
          "shared-burn"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent17",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent1",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent2",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent8",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent7",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent3",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "PAY_CAPPED",
        "tier": "new",
        "rules": [
          "shared-burn"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent6",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "PAY_CAPPED",
        "tier": "new",
        "rules": [
          "shared-burn"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 1,
        "agent": "agent4",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent9",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent1",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent13",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent2",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent17",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent14",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent19",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent9",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent4",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent3",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent7",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent8",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent15",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent12",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent10",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent6",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent5",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent19",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent20",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent1",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent18",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent7",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent10",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent4",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent6",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent9",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent5",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent16",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent15",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent17",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent14",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent13",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent11",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent2",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent12",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent19",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent4",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent7",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent1",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent3",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent18",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent6",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent2",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent20",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent9",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent13",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent16",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent15",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent5",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent17",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent1",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent12",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent7",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent5",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent3",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent19",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent10",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent14",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent11",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent17",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent13",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent9",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent8",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent20",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent15",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent16",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent6",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent13",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent20",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent12",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent1",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent16",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent2",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent7",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent6",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent9",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent5",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent8",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent3",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent18",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent10",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent4",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent17",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent15",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent13",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent18",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent8",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent9",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent6",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent1",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent14",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent15",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent5",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent17",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent7",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent16",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent19",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent4",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent20",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "similar-incident"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent15",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent16",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent5",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent7",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent14",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent20",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent8",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent9",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent6",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent1",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent12",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent13",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent17",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent19",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent11",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent14",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent1",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent15",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent8",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent6",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent20",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent17",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent3",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent4",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent9",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent13",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent7",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent5",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent6",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent1",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent12",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent3",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent15",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent4",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent10",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent9",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent7",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent14",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent5",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent19",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent16",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent13",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent20",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent17",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent8",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent19",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent5",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent1",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent4",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent9",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent17",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent16",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent14",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent13",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent10",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent12",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent2",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent18",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "established",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent6",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent3",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent7",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent15",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent1",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent15",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent18",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "established",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent17",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "shared-burns"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent16",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent10",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent13",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent12",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent7",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent9",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent5",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent6",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "PAY",
        "tier": "trusted",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      }
    ]
  },
  "detached": {
    "config": {
      "agents": 20,
      "rounds": 12,
      "seed": 1,
      "mode": "detached",
      "pApprove": 0.8,
      "turnAtRound": 6,
      "flakyRate": 0.4,
      "maxLatencyMs": 400,
      "lateMs": 1500
    },
    "burns": 17,
    "paid": 192,
    "refused": 9,
    "refusedGood": 0,
    "asked": 231,
    "lostRaw": "170000",
    "burnsByMerchant": {
      "flaky1.fides-sim.test": 16,
      "malicious1.fides-sim.test": 1
    },
    "rules": {
      "tier": 217,
      "own-history": 14,
      "address": 9
    },
    "events": [
      {
        "round": 1,
        "agent": "agent10",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 1,
        "agent": "agent14",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent15",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent5",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent13",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent20",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent17",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent1",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent2",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent8",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent7",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent3",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent6",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 1,
        "agent": "agent9",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent19",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent11",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent12",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent9",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent6",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent4",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent20",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent16",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent2",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 2,
        "agent": "agent3",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent10",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent7",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent5",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent15",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent1",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent18",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent13",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 2,
        "agent": "agent17",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent10",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent19",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent11",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent9",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent1",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent12",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent7",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent6",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 3,
        "agent": "agent8",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent17",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent5",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent4",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent20",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent15",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 3,
        "agent": "agent13",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 3,
        "agent": "agent3",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent2",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "own-history"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent7",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent10",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent20",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent9",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent17",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent14",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent19",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 4,
        "agent": "agent16",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent13",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent6",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent8",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent1",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent15",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent18",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent3",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 4,
        "agent": "agent5",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent18",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 5,
        "agent": "agent9",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent10",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent3",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent7",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent13",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent16",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent4",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent6",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 5,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent2",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent17",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 5,
        "agent": "agent15",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent14",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent20",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent5",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 5,
        "agent": "agent1",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent18",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent1",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent8",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent17",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent7",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent12",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent9",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent15",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent11",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 6,
        "agent": "agent13",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent6",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent20",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent2",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent19",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 6,
        "agent": "agent5",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent6",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent13",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent4",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent15",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent19",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent7",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 7,
        "agent": "agent5",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent16",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent17",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent14",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent18",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent1",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent12",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent2",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent9",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent8",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent3",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 7,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent2",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent17",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 8,
        "agent": "agent18",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent5",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 8,
        "agent": "agent9",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent13",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent1",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent7",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent6",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent19",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 8,
        "agent": "agent15",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent10",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent12",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 8,
        "agent": "agent11",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent8",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 8,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 8,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent18",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent10",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent14",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent17",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent12",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent4",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent2",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent3",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent9",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent15",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent11",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent6",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent19",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent20",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent8",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent5",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent7",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent1",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 9,
        "agent": "agent13",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent8",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent13",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent11",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent4",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent15",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent10",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent9",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 10,
        "agent": "agent17",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent3",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent6",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent5",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent18",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent16",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent2",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent7",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent12",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent19",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 10,
        "agent": "agent1",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent18",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent2",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent20",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent5",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent14",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent13",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent16",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent19",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent1",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent6",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "REFUSE",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent3",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent8",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent15",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent17",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent4",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent11",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent10",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent7",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": true
      },
      {
        "round": 11,
        "agent": "agent12",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 11,
        "agent": "agent9",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent1",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent11",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent12",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent14",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent17",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent13",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent10",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent19",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent3",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent4",
        "merchant": "good4.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent5",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent20",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "burned",
        "rules": [
          "own-history"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent7",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent2",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent15",
        "merchant": "malicious1.fides-sim.test",
        "kind": "malicious",
        "decision": "REFUSE",
        "tier": "new",
        "rules": [
          "address"
        ],
        "paid": false,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent18",
        "merchant": "good2.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent16",
        "merchant": "flaky1.fides-sim.test",
        "kind": "flaky",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent8",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent9",
        "merchant": "good1.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": true,
        "burned": false
      },
      {
        "round": 12,
        "agent": "agent6",
        "merchant": "good3.fides-sim.test",
        "kind": "good",
        "decision": "ASK",
        "tier": "new",
        "rules": [
          "tier"
        ],
        "paid": false,
        "burned": false
      }
    ]
  }
};
