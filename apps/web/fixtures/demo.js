window.FIDES_DEMO = {
  "generatedAt": "2026-11-04T16:21:44.337Z",
  "mode": "sim",
  "network": "sim",
  "ok": true,
  "lost": {
    "A": "10000",
    "B": "10000",
    "C": "10000"
  },
  "merchants": {
    "good": "good.fides-demo.test",
    "flaky": "flaky.fides-demo.test",
    "malicious": "malicious.fides-demo.test"
  },
  "steps": [
    {
      "id": 1,
      "title": "Agent A, cold start, meets every merchant",
      "results": [
        {
          "agent": "A",
          "url": "http://127.0.0.1:56063/data/prices",
          "host": "good.fides-demo.test",
          "decision": "ASK",
          "approved": true,
          "paid": true,
          "txDigest": "TX000000000000000000000000000000000000000001",
          "status": 200,
          "exchange": {
            "checks": {
              "schemaValid": true,
              "fresh": true,
              "onTime": true,
              "amountMatchesQuote": true,
              "payToMatchesPinned": true
            },
            "problems": [],
            "responseHash": "8c95fba6a091f04a52ea6c3f1d6cba869b1972378975c01389fafb6e9dfcbc82",
            "responseBytes": 120
          },
          "check": {
            "verdict": {
              "decision": "ASK",
              "reasons": [
                "cannot say: not enough history to classify this merchant"
              ],
              "rulesFired": [
                "tier"
              ],
              "citations": {
                "evidenceIds": [],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0,
              "cannotSay": true,
              "alerts": []
            },
            "decisionId": 1,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "55faf4002508e76b92f002dbd6aff90112536186c479432110e2730dc50f49fb",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000001"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-55faf400"
              }
            }
          }
        },
        {
          "agent": "A",
          "url": "http://127.0.0.1:56064/data/news",
          "host": "flaky.fides-demo.test",
          "decision": "ASK",
          "approved": true,
          "paid": true,
          "txDigest": "TX000000000000000000000000000000000000000002",
          "status": 200,
          "exchange": {
            "checks": {
              "schemaValid": true,
              "fresh": true,
              "onTime": true,
              "amountMatchesQuote": true,
              "payToMatchesPinned": true
            },
            "problems": [],
            "responseHash": "3ea2d3ae0d7e5c24d1fb045a7211fc4b6294e47b631946e26ffba839daadf0d4",
            "responseBytes": 146
          },
          "check": {
            "verdict": {
              "decision": "ASK",
              "reasons": [
                "cannot say: not enough history to classify this merchant"
              ],
              "rulesFired": [
                "tier"
              ],
              "citations": {
                "evidenceIds": [],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0,
              "cannotSay": true,
              "alerts": []
            },
            "decisionId": 2,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "b7b6e0a42b93c3e90872c4b2f30432567c1b9edcc87f4794e719aa035d3b0363",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000002"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-b7b6e0a4"
              }
            }
          }
        },
        {
          "agent": "A",
          "url": "http://127.0.0.1:56065/data/signal",
          "host": "malicious.fides-demo.test",
          "decision": "ASK",
          "approved": true,
          "paid": true,
          "txDigest": "TX000000000000000000000000000000000000000003",
          "status": 200,
          "exchange": {
            "checks": {
              "schemaValid": true,
              "fresh": true,
              "onTime": true,
              "amountMatchesQuote": true,
              "payToMatchesPinned": true
            },
            "problems": [],
            "responseHash": "20d0e8f1f9dfd5bfd8deeee017cdcc8bb5ecf67da95011925670e6fa91f57cb5",
            "responseBytes": 104
          },
          "check": {
            "verdict": {
              "decision": "ASK",
              "reasons": [
                "cannot say: not enough history to classify this merchant"
              ],
              "rulesFired": [
                "tier"
              ],
              "citations": {
                "evidenceIds": [],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0,
              "cannotSay": true,
              "alerts": []
            },
            "decisionId": 3,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "9342cd98857ee25cd2d44afc4644719365bd18e9a6d16f868b75ca1972dd63d2",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000003"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-9342cd98"
              }
            }
          }
        }
      ],
      "checks": [],
      "notes": [],
      "expectations": [
        {
          "label": "A asks about good and cannot say yet",
          "ok": true,
          "detail": "ASK"
        },
        {
          "label": "A pays good once and it delivers",
          "ok": true
        },
        {
          "label": "A asks about flaky and cannot say yet",
          "ok": true,
          "detail": "ASK"
        },
        {
          "label": "A pays flaky once and it delivers",
          "ok": true
        },
        {
          "label": "A asks about malicious and cannot say yet",
          "ok": true,
          "detail": "ASK"
        },
        {
          "label": "A pays malicious once and it delivers",
          "ok": true
        }
      ]
    },
    {
      "id": 2,
      "title": "A pays the flaky merchant again and gets junk",
      "results": [
        {
          "agent": "A",
          "url": "http://127.0.0.1:56064/data/news",
          "host": "flaky.fides-demo.test",
          "decision": "ASK",
          "approved": true,
          "paid": true,
          "txDigest": "TX000000000000000000000000000000000000000004",
          "status": 200,
          "exchange": {
            "checks": {
              "schemaValid": false,
              "fresh": true,
              "onTime": true,
              "amountMatchesQuote": true,
              "payToMatchesPinned": true
            },
            "problems": [
              "schema is \"wrong/v0\", expected fides.news/v1",
              "data is missing or not an object"
            ],
            "responseHash": "bd678abc7391f047ea1a208d2b934fdf84dd2c43891907cc5af8971acf5d2c29",
            "responseBytes": 94
          },
          "check": {
            "verdict": {
              "decision": "ASK",
              "reasons": [
                "cannot say: not enough history to classify this merchant"
              ],
              "rulesFired": [
                "tier"
              ],
              "citations": {
                "evidenceIds": [
                  "b7b6e0a42b93c3e90872c4b2f30432567c1b9edcc87f4794e719aa035d3b0363"
                ],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.13177876031114893,
              "cannotSay": true,
              "alerts": []
            },
            "decisionId": 4,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000004"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-381ab15e"
              }
            }
          }
        }
      ],
      "checks": [],
      "notes": [],
      "expectations": [
        {
          "label": "A is burned and reports a signed burn",
          "ok": true
        },
        {
          "label": "the burn is anchored on Sui and written to the shared record",
          "ok": true
        }
      ]
    },
    {
      "id": 3,
      "title": "C is burned too; B, who has never met flaky, reads the shared record and refuses",
      "results": [
        {
          "agent": "C",
          "url": "http://127.0.0.1:56064/data/news",
          "host": "flaky.fides-demo.test",
          "decision": "PAY_CAPPED",
          "approved": null,
          "paid": true,
          "txDigest": "TX000000000000000000000000000000000000000005",
          "status": 200,
          "exchange": {
            "checks": {
              "schemaValid": true,
              "fresh": false,
              "onTime": true,
              "amountMatchesQuote": true,
              "payToMatchesPinned": true
            },
            "problems": [
              "asOf is 3600 s old, maximum is 120 s"
            ],
            "responseHash": "84986fe9a4d40fae08e076954463e4b5e621c8dbb96c1449116a2e09b2fc0261",
            "responseBytes": 146
          },
          "check": {
            "verdict": {
              "decision": "PAY_CAPPED",
              "capAmount": "0.05",
              "reasons": [
                "one other reporter has a verified burn for this merchant: small payments only"
              ],
              "rulesFired": [
                "shared-burn"
              ],
              "citations": {
                "evidenceIds": [
                  "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3"
                ],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.19391623721840748,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 1,
            "claim": {
              "key": "C:flaky.fides-demo.test:1793809304199:1",
              "status": "reserved"
            },
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "aef07b22286e719ba5908af80eb7f2977964157f9ec74f557069101c958ae0b1",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000005"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-aef07b22"
              }
            }
          }
        },
        {
          "agent": "B",
          "url": "http://127.0.0.1:56064/data/news",
          "host": "flaky.fides-demo.test",
          "decision": "REFUSE",
          "approved": null,
          "paid": false,
          "check": {
            "verdict": {
              "decision": "REFUSE",
              "reasons": [
                "2 independent reporters have verified burns for this merchant"
              ],
              "rulesFired": [
                "shared-burns"
              ],
              "citations": {
                "evidenceIds": [
                  "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3",
                  "aef07b22286e719ba5908af80eb7f2977964157f9ec74f557069101c958ae0b1"
                ],
                "memoryBlobIds": []
              },
              "tier": "burned",
              "confidence": 0.24038475706413812,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 1,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "error": "refused"
        }
      ],
      "checks": [],
      "notes": [],
      "expectations": [
        {
          "label": "C is burned by the same merchant",
          "ok": true
        },
        {
          "label": "B refuses, citing both signed burns",
          "ok": true,
          "detail": "REFUSE (refused)"
        },
        {
          "label": "B pays nothing",
          "ok": true
        },
        {
          "label": "A's burn is one of the cited records",
          "ok": true
        }
      ]
    },
    {
      "id": 4,
      "title": "The malicious merchant swaps its payout address and quotes 4x",
      "results": [
        {
          "agent": "A",
          "url": "http://127.0.0.1:56065/data/signal",
          "host": "malicious.fides-demo.test",
          "decision": "REFUSE",
          "approved": null,
          "paid": false,
          "check": {
            "verdict": {
              "decision": "REFUSE",
              "reasons": [
                "payout address changed from the pinned address and the price spiked"
              ],
              "rulesFired": [
                "address"
              ],
              "citations": {
                "evidenceIds": [],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.1498126254022388,
              "cannotSay": true,
              "alerts": [
                {
                  "kind": "address_changed",
                  "merchant": "malicious.fides-demo.test"
                }
              ]
            },
            "decisionId": 5,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "error": "refused"
        },
        {
          "agent": "B",
          "url": "http://127.0.0.1:56065/data/signal",
          "host": "malicious.fides-demo.test",
          "decision": "REFUSE",
          "approved": null,
          "paid": false,
          "check": {
            "verdict": {
              "decision": "REFUSE",
              "reasons": [
                "payout address changed from the pinned address and the price spiked",
                "the pinned address comes from verified reports in the shared record"
              ],
              "rulesFired": [
                "address"
              ],
              "citations": {
                "evidenceIds": [],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.13177875493497448,
              "cannotSay": true,
              "alerts": [
                {
                  "kind": "address_changed",
                  "merchant": "malicious.fides-demo.test"
                }
              ]
            },
            "decisionId": 2,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "error": "refused"
        }
      ],
      "checks": [],
      "notes": [],
      "expectations": [
        {
          "label": "A refuses: address changed from the one it paid, price jumped",
          "ok": true,
          "detail": "REFUSE (refused)"
        },
        {
          "label": "B refuses too, though it never paid this merchant: the pinned address comes from the shared record",
          "ok": true,
          "detail": "REFUSE (refused)"
        },
        {
          "label": "both raised an address alert",
          "ok": true
        }
      ]
    },
    {
      "id": 5,
      "title": "B detaches the shared memory: no access to it, nothing deleted",
      "results": [
        {
          "agent": "B",
          "url": "http://127.0.0.1:56064/data/news",
          "host": "flaky.fides-demo.test",
          "decision": "ASK",
          "approved": true,
          "paid": true,
          "txDigest": "TX000000000000000000000000000000000000000006",
          "status": 200,
          "exchange": {
            "checks": {
              "schemaValid": false,
              "fresh": true,
              "onTime": true,
              "amountMatchesQuote": true,
              "payToMatchesPinned": true
            },
            "problems": [
              "schema is \"wrong/v0\", expected fides.news/v1",
              "data is missing or not an object"
            ],
            "responseHash": "f9bcd5740a4766dc69705dd9ec0dd55413d3a90ed6648d5dee14afbfc4d90619",
            "responseBytes": 94
          },
          "check": {
            "verdict": {
              "decision": "ASK",
              "reasons": [
                "cannot say: not enough history to classify this merchant"
              ],
              "rulesFired": [
                "tier"
              ],
              "citations": {
                "evidenceIds": [],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0,
              "cannotSay": true,
              "alerts": []
            },
            "decisionId": 3,
            "sharedState": "detached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "5b417c84e6b2c32e7c2a71eaa60b7209663d673f35a9cdcf0fba2216f0885b65",
            "status": "partial",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000006"
              },
              "memory": {
                "ok": false,
                "skipped": "detached"
              }
            }
          }
        }
      ],
      "checks": [],
      "notes": [
        "Detaching removes B's access to the shared record. Nothing was deleted from it."
      ],
      "expectations": [
        {
          "label": "B no longer sees the burns: it can only ask a person",
          "ok": true,
          "detail": "ASK"
        },
        {
          "label": "B cites no shared records",
          "ok": true
        },
        {
          "label": "the person approves and B is burned: the same loss A and C had",
          "ok": true
        },
        {
          "label": "once attached again, B's held burn is written to the shared record",
          "ok": true
        }
      ]
    },
    {
      "id": 6,
      "title": "Re-verify a real record, then reject a forged one",
      "results": [],
      "checks": [],
      "notes": [
        "re-verify format        ok   well formed, 1076 bytes, canonical",
        "re-verify hash          ok   sha256 b7b6e0a42b93c3e90872c4b2f30432567c1b9edcc87f4794e719aa035d3b0363 matches the Sui anchor",
        "re-verify signature     ok   signed by reporter 0x0eb48552bd4de4dc47b687593daedcf2a4cf789491cd1dbfbf5161495f2177ae",
        "re-verify anchor-sender ok   anchor event sender equals the reporter",
        "re-verify payment       ok   final in checkpoint 1002, sender is the reporter, 10000 paid to 0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4",
        "forged record 9904358b: REJECTED, no anchor event found for this evidence (it may not be indexed yet)"
      ],
      "expectations": [
        {
          "label": "the anchor event for the record is found on Sui",
          "ok": true
        },
        {
          "label": "a real record passes every step of the re-verify",
          "ok": true
        },
        {
          "label": "the forged record is rejected and shown",
          "ok": true
        },
        {
          "label": "it changes nothing: B cites the same signed records and reaches the same decision",
          "ok": true,
          "detail": "REFUSE -> REFUSE"
        }
      ]
    },
    {
      "id": 7,
      "title": "The shared record cannot be reached: B fails closed",
      "results": [],
      "checks": [
        {
          "label": "attached",
          "check": {
            "verdict": {
              "decision": "REFUSE",
              "reasons": [
                "3 independent reporters, this agent among them, have verified burns for this merchant"
              ],
              "rulesFired": [
                "shared-burns"
              ],
              "citations": {
                "evidenceIds": [
                  "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3",
                  "aef07b22286e719ba5908af80eb7f2977964157f9ec74f557069101c958ae0b1",
                  "5b417c84e6b2c32e7c2a71eaa60b7209663d673f35a9cdcf0fba2216f0885b65"
                ],
                "memoryBlobIds": []
              },
              "tier": "burned",
              "confidence": 0.31287555927267774,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 6,
            "sharedState": "attached",
            "rejected": [
              {
                "blobId": "inj6",
                "evidenceId": "9904358baee85e3fb11c67f143c262fd8107586f891a44a14ccde870d32b2083",
                "reason": "no anchor event found for this evidence (it may not be indexed yet)"
              }
            ],
            "pending": 0
          }
        },
        {
          "label": "unreachable",
          "check": {
            "verdict": {
              "decision": "ASK",
              "reasons": [
                "this agent was burned by this merchant before"
              ],
              "rulesFired": [
                "own-history"
              ],
              "citations": {
                "evidenceIds": [
                  "5b417c84e6b2c32e7c2a71eaa60b7209663d673f35a9cdcf0fba2216f0885b65"
                ],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.07053702099244444,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 7,
            "sharedState": "unreachable",
            "rejected": [],
            "pending": 0
          }
        },
        {
          "label": "recovered",
          "check": {
            "verdict": {
              "decision": "REFUSE",
              "reasons": [
                "3 independent reporters, this agent among them, have verified burns for this merchant"
              ],
              "rulesFired": [
                "shared-burns"
              ],
              "citations": {
                "evidenceIds": [
                  "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3",
                  "aef07b22286e719ba5908af80eb7f2977964157f9ec74f557069101c958ae0b1",
                  "5b417c84e6b2c32e7c2a71eaa60b7209663d673f35a9cdcf0fba2216f0885b65"
                ],
                "memoryBlobIds": []
              },
              "tier": "burned",
              "confidence": 0.312875558656706,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 8,
            "sharedState": "attached",
            "rejected": [
              {
                "blobId": "inj6",
                "evidenceId": "9904358baee85e3fb11c67f143c262fd8107586f891a44a14ccde870d32b2083",
                "reason": "no anchor event found for this evidence (it may not be indexed yet)"
              }
            ],
            "pending": 0
          }
        }
      ],
      "notes": [
        "shared record unreachable: ASK [own-history] cites 1 record(s)"
      ],
      "expectations": [
        {
          "label": "while it is reachable B refuses flaky, citing the signed burns",
          "ok": true,
          "detail": "REFUSE"
        },
        {
          "label": "B is told the record is unreachable, not that there are no reports",
          "ok": true,
          "detail": "unreachable"
        },
        {
          "label": "it will not pay: unreachable never softens a decision into a payment",
          "ok": true,
          "detail": "ASK"
        },
        {
          "label": "when the record comes back B refuses again, citing the same burns",
          "ok": true
        }
      ]
    }
  ],
  "events": [
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:56063/data/prices",
      "host": "good.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "A",
      "host": "good.fides-demo.test",
      "decision": "ASK",
      "rules": [
        "tier"
      ],
      "reasons": [
        "cannot say: not enough history to classify this merchant"
      ],
      "evidenceIds": [],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0,
      "cannotSay": true
    },
    {
      "type": "asked",
      "agent": "A",
      "host": "good.fides-demo.test",
      "approved": true
    },
    {
      "type": "paid",
      "agent": "A",
      "host": "good.fides-demo.test",
      "txDigest": "TX000000000000000000000000000000000000000001"
    },
    {
      "type": "response",
      "agent": "A",
      "host": "good.fides-demo.test",
      "status": 200,
      "latencyMs": 5,
      "checks": {
        "schemaValid": true,
        "fresh": true,
        "onTime": true,
        "amountMatchesQuote": true,
        "payToMatchesPinned": true
      },
      "problems": []
    },
    {
      "type": "reported",
      "agent": "A",
      "host": "good.fides-demo.test",
      "status": "complete",
      "evidenceId": "55faf4002508e76b92f002dbd6aff90112536186c479432110e2730dc50f49fb",
      "verdict": "clean"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:56064/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "decision": "ASK",
      "rules": [
        "tier"
      ],
      "reasons": [
        "cannot say: not enough history to classify this merchant"
      ],
      "evidenceIds": [],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0,
      "cannotSay": true
    },
    {
      "type": "asked",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "approved": true
    },
    {
      "type": "paid",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "txDigest": "TX000000000000000000000000000000000000000002"
    },
    {
      "type": "response",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "status": 200,
      "latencyMs": 4,
      "checks": {
        "schemaValid": true,
        "fresh": true,
        "onTime": true,
        "amountMatchesQuote": true,
        "payToMatchesPinned": true
      },
      "problems": []
    },
    {
      "type": "reported",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "status": "complete",
      "evidenceId": "b7b6e0a42b93c3e90872c4b2f30432567c1b9edcc87f4794e719aa035d3b0363",
      "verdict": "clean"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:56065/data/signal",
      "host": "malicious.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "decision": "ASK",
      "rules": [
        "tier"
      ],
      "reasons": [
        "cannot say: not enough history to classify this merchant"
      ],
      "evidenceIds": [],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0,
      "cannotSay": true
    },
    {
      "type": "asked",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "approved": true
    },
    {
      "type": "paid",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "txDigest": "TX000000000000000000000000000000000000000003"
    },
    {
      "type": "response",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "status": 200,
      "latencyMs": 5,
      "checks": {
        "schemaValid": true,
        "fresh": true,
        "onTime": true,
        "amountMatchesQuote": true,
        "payToMatchesPinned": true
      },
      "problems": []
    },
    {
      "type": "reported",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "status": "complete",
      "evidenceId": "9342cd98857ee25cd2d44afc4644719365bd18e9a6d16f868b75ca1972dd63d2",
      "verdict": "clean"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:56064/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "decision": "ASK",
      "rules": [
        "tier"
      ],
      "reasons": [
        "cannot say: not enough history to classify this merchant"
      ],
      "evidenceIds": [
        "b7b6e0a42b93c3e90872c4b2f30432567c1b9edcc87f4794e719aa035d3b0363"
      ],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0.13177876031114893,
      "cannotSay": true
    },
    {
      "type": "asked",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "approved": true
    },
    {
      "type": "paid",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "txDigest": "TX000000000000000000000000000000000000000004"
    },
    {
      "type": "response",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "status": 200,
      "latencyMs": 4,
      "checks": {
        "schemaValid": false,
        "fresh": true,
        "onTime": true,
        "amountMatchesQuote": true,
        "payToMatchesPinned": true
      },
      "problems": [
        "schema is \"wrong/v0\", expected fides.news/v1",
        "data is missing or not an object"
      ]
    },
    {
      "type": "reported",
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "status": "complete",
      "evidenceId": "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3",
      "verdict": "burned"
    },
    {
      "type": "challenge",
      "agent": "C",
      "url": "http://127.0.0.1:56064/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "C",
      "host": "flaky.fides-demo.test",
      "decision": "PAY_CAPPED",
      "rules": [
        "shared-burn"
      ],
      "reasons": [
        "one other reporter has a verified burn for this merchant: small payments only"
      ],
      "evidenceIds": [
        "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3"
      ],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0.19391623721840748,
      "cannotSay": false
    },
    {
      "type": "paid",
      "agent": "C",
      "host": "flaky.fides-demo.test",
      "txDigest": "TX000000000000000000000000000000000000000005"
    },
    {
      "type": "response",
      "agent": "C",
      "host": "flaky.fides-demo.test",
      "status": 200,
      "latencyMs": 2,
      "checks": {
        "schemaValid": true,
        "fresh": false,
        "onTime": true,
        "amountMatchesQuote": true,
        "payToMatchesPinned": true
      },
      "problems": [
        "asOf is 3600 s old, maximum is 120 s"
      ]
    },
    {
      "type": "reported",
      "agent": "C",
      "host": "flaky.fides-demo.test",
      "status": "complete",
      "evidenceId": "aef07b22286e719ba5908af80eb7f2977964157f9ec74f557069101c958ae0b1",
      "verdict": "burned"
    },
    {
      "type": "challenge",
      "agent": "B",
      "url": "http://127.0.0.1:56064/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "decision": "REFUSE",
      "rules": [
        "shared-burns"
      ],
      "reasons": [
        "2 independent reporters have verified burns for this merchant"
      ],
      "evidenceIds": [
        "381ab15ed0b95c5a6b1cc31b9bfe48462f7ee2bf06dff24e0eece33f098ef3a3",
        "aef07b22286e719ba5908af80eb7f2977964157f9ec74f557069101c958ae0b1"
      ],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "burned",
      "confidence": 0.24038475706413812,
      "cannotSay": false
    },
    {
      "type": "skipped",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "why": "refused"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:56065/data/signal",
      "host": "malicious.fides-demo.test",
      "amount": "0.04",
      "recipient": "0x793d71ed9eac4ab3187ecd0d951f56f0e91b0e1cfe6ee1bcf6aec1dbc48ce62f"
    },
    {
      "type": "check",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "decision": "REFUSE",
      "rules": [
        "address"
      ],
      "reasons": [
        "payout address changed from the pinned address and the price spiked"
      ],
      "evidenceIds": [],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0.1498126254022388,
      "cannotSay": true
    },
    {
      "type": "skipped",
      "agent": "A",
      "host": "malicious.fides-demo.test",
      "why": "refused"
    },
    {
      "type": "challenge",
      "agent": "B",
      "url": "http://127.0.0.1:56065/data/signal",
      "host": "malicious.fides-demo.test",
      "amount": "0.04",
      "recipient": "0x793d71ed9eac4ab3187ecd0d951f56f0e91b0e1cfe6ee1bcf6aec1dbc48ce62f"
    },
    {
      "type": "check",
      "agent": "B",
      "host": "malicious.fides-demo.test",
      "decision": "REFUSE",
      "rules": [
        "address"
      ],
      "reasons": [
        "payout address changed from the pinned address and the price spiked",
        "the pinned address comes from verified reports in the shared record"
      ],
      "evidenceIds": [],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0.13177875493497448,
      "cannotSay": true
    },
    {
      "type": "skipped",
      "agent": "B",
      "host": "malicious.fides-demo.test",
      "why": "refused"
    },
    {
      "type": "challenge",
      "agent": "B",
      "url": "http://127.0.0.1:56064/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x7c6fa36c5469abe8e61e2532cee920e863950972cf6b9638d1a5476a63207bb4"
    },
    {
      "type": "check",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "decision": "ASK",
      "rules": [
        "tier"
      ],
      "reasons": [
        "cannot say: not enough history to classify this merchant"
      ],
      "evidenceIds": [],
      "memoryBlobIds": [],
      "sharedState": "detached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0,
      "cannotSay": true
    },
    {
      "type": "asked",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "approved": true
    },
    {
      "type": "paid",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "txDigest": "TX000000000000000000000000000000000000000006"
    },
    {
      "type": "response",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "status": 200,
      "latencyMs": 3,
      "checks": {
        "schemaValid": false,
        "fresh": true,
        "onTime": true,
        "amountMatchesQuote": true,
        "payToMatchesPinned": true
      },
      "problems": [
        "schema is \"wrong/v0\", expected fides.news/v1",
        "data is missing or not an object"
      ]
    },
    {
      "type": "reported",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "status": "partial",
      "evidenceId": "5b417c84e6b2c32e7c2a71eaa60b7209663d673f35a9cdcf0fba2216f0885b65",
      "verdict": "burned"
    },
    {
      "type": "error",
      "agent": "B",
      "host": "flaky.fides-demo.test",
      "message": "report only partly written, queued for retry: detached"
    }
  ]
};
