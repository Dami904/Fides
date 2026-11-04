window.FIDES_DEMO = {
  "generatedAt": "2026-11-04T14:25:32.813Z",
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
          "url": "http://127.0.0.1:51566/data/prices",
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
            "responseHash": "1c6dd5ebf927f60f809c614e8b78ddfb0f7687a47debc6afdff1c67f270279e0",
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
            "evidenceId": "e3db17e1fbdeeb8515db4625f8deec3145ea0de3e5c8d9d22277c5132981dbef",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000001"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-e3db17e1"
              }
            }
          }
        },
        {
          "agent": "A",
          "url": "http://127.0.0.1:51567/data/news",
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
            "responseHash": "99a4065c7b538804b376b4a7262f91b8f72d5437546ec1d6d832f44e917b8292",
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
            "evidenceId": "67818c60ff143cb1ce5e2f4760f3a83176dfe7971c9757a8857937e8e3632f6f",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000002"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-67818c60"
              }
            }
          }
        },
        {
          "agent": "A",
          "url": "http://127.0.0.1:51568/data/signal",
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
            "responseHash": "936eb9c93d070b91acd1844159505b40a358262c62445afe0b75d7d760c32a9e",
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
            "evidenceId": "c504345cfa0371afab4b8ee3140cbef8c9efce600caa000e617f38e4e3870199",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000003"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-c504345c"
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
          "url": "http://127.0.0.1:51567/data/news",
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
            "responseHash": "a36bd9c84c05982ba4a5fae7ace15c735e364d0321002192e2799abbf13e18be",
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
                  "67818c60ff143cb1ce5e2f4760f3a83176dfe7971c9757a8857937e8e3632f6f"
                ],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.13177875860650826,
              "cannotSay": true,
              "alerts": []
            },
            "decisionId": 4,
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000004"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-d8a91cfb"
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
          "url": "http://127.0.0.1:51567/data/news",
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
            "responseHash": "954d2e8cfd84a31fa26fd2521a5b9bb62563026f676d7518b24747481f2d3b65",
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
                  "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119"
                ],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.19391623556130352,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 1,
            "claim": {
              "key": "C:flaky.fides-demo.test:1793802332627:1",
              "status": "reserved"
            },
            "sharedState": "attached",
            "rejected": [],
            "pending": 0
          },
          "receipt": {
            "evidenceId": "0f49c389533a8a5af6a034535eaabfef03009596b32ab68c0c159b0102d03c0b",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000005"
              },
              "memory": {
                "ok": true,
                "blobId": "blob-of-job-0f49c389"
              }
            }
          }
        },
        {
          "agent": "B",
          "url": "http://127.0.0.1:51567/data/news",
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
                  "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119",
                  "0f49c389533a8a5af6a034535eaabfef03009596b32ab68c0c159b0102d03c0b"
                ],
                "memoryBlobIds": []
              },
              "tier": "burned",
              "confidence": 0.24038475461723038,
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
          "url": "http://127.0.0.1:51568/data/signal",
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
              "confidence": 0.14981262299366097,
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
          "url": "http://127.0.0.1:51568/data/signal",
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
              "confidence": 0.13177875264026598,
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
          "url": "http://127.0.0.1:51567/data/news",
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
            "responseHash": "4c5b2275c893b7ddb36d316502b0490ff2edca4cc9ee96c028e7ec3ab4eac084",
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
            "evidenceId": "7667f1bb760a7a8df779fbe077b42766070202b2e60fae28f111e265ae6efd47",
            "status": "complete",
            "steps": {
              "anchor": {
                "ok": true,
                "txDigest": "ANCH000006"
              },
              "memory": {
                "ok": true,
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
        "re-verify hash          ok   sha256 67818c60ff143cb1ce5e2f4760f3a83176dfe7971c9757a8857937e8e3632f6f matches the Sui anchor",
        "re-verify signature     ok   signed by reporter 0x0ba74e111902755ed78cbb161b82c88f1e61802a3cc7a3ebcdc3e33c883f1a36",
        "re-verify anchor-sender ok   anchor event sender equals the reporter",
        "re-verify payment       ok   final in checkpoint 1002, sender is the reporter, 10000 paid to 0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a",
        "forged record 596a4860: REJECTED, no anchor event found for this evidence (it may not be indexed yet)"
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
                "2 independent reporters have verified burns for this merchant"
              ],
              "rulesFired": [
                "shared-burns"
              ],
              "citations": {
                "evidenceIds": [
                  "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119",
                  "0f49c389533a8a5af6a034535eaabfef03009596b32ab68c0c159b0102d03c0b"
                ],
                "memoryBlobIds": []
              },
              "tier": "burned",
              "confidence": 0.3128755530513642,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 6,
            "sharedState": "attached",
            "rejected": [
              {
                "blobId": "inj5",
                "evidenceId": "596a48608eac4e0d30917a091f038771428138eef1b4fca99c46b59f2700e985",
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
                  "7667f1bb760a7a8df779fbe077b42766070202b2e60fae28f111e265ae6efd47"
                ],
                "memoryBlobIds": []
              },
              "tier": "new",
              "confidence": 0.07053702039133593,
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
                "2 independent reporters have verified burns for this merchant"
              ],
              "rulesFired": [
                "shared-burns"
              ],
              "citations": {
                "evidenceIds": [
                  "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119",
                  "0f49c389533a8a5af6a034535eaabfef03009596b32ab68c0c159b0102d03c0b"
                ],
                "memoryBlobIds": []
              },
              "tier": "burned",
              "confidence": 0.3128755523121982,
              "cannotSay": false,
              "alerts": []
            },
            "decisionId": 8,
            "sharedState": "attached",
            "rejected": [
              {
                "blobId": "inj5",
                "evidenceId": "596a48608eac4e0d30917a091f038771428138eef1b4fca99c46b59f2700e985",
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
      "url": "http://127.0.0.1:51566/data/prices",
      "host": "good.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
      "latencyMs": 11,
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
      "evidenceId": "e3db17e1fbdeeb8515db4625f8deec3145ea0de3e5c8d9d22277c5132981dbef",
      "verdict": "clean"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:51567/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
      "latencyMs": 6,
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
      "evidenceId": "67818c60ff143cb1ce5e2f4760f3a83176dfe7971c9757a8857937e8e3632f6f",
      "verdict": "clean"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:51568/data/signal",
      "host": "malicious.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
      "evidenceId": "c504345cfa0371afab4b8ee3140cbef8c9efce600caa000e617f38e4e3870199",
      "verdict": "clean"
    },
    {
      "type": "challenge",
      "agent": "A",
      "url": "http://127.0.0.1:51567/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
        "67818c60ff143cb1ce5e2f4760f3a83176dfe7971c9757a8857937e8e3632f6f"
      ],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0.13177875860650826,
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
      "agent": "A",
      "host": "flaky.fides-demo.test",
      "status": "complete",
      "evidenceId": "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119",
      "verdict": "burned"
    },
    {
      "type": "challenge",
      "agent": "C",
      "url": "http://127.0.0.1:51567/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
        "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119"
      ],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "new",
      "confidence": 0.19391623556130352,
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
      "latencyMs": 3,
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
      "evidenceId": "0f49c389533a8a5af6a034535eaabfef03009596b32ab68c0c159b0102d03c0b",
      "verdict": "burned"
    },
    {
      "type": "challenge",
      "agent": "B",
      "url": "http://127.0.0.1:51567/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
        "d8a91cfbb6ff2223a290803bf17372e1d207e7ce2fa5ea6f3791e3a36a999119",
        "0f49c389533a8a5af6a034535eaabfef03009596b32ab68c0c159b0102d03c0b"
      ],
      "memoryBlobIds": [],
      "sharedState": "attached",
      "rejected": 0,
      "pending": 0,
      "tier": "burned",
      "confidence": 0.24038475461723038,
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
      "url": "http://127.0.0.1:51568/data/signal",
      "host": "malicious.fides-demo.test",
      "amount": "0.04",
      "recipient": "0xa34b62ccea18b9fd46c3f943daafa8d4cad745aae1aba9b5af3a9982e0aebfac"
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
      "confidence": 0.14981262299366097,
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
      "url": "http://127.0.0.1:51568/data/signal",
      "host": "malicious.fides-demo.test",
      "amount": "0.04",
      "recipient": "0xa34b62ccea18b9fd46c3f943daafa8d4cad745aae1aba9b5af3a9982e0aebfac"
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
      "confidence": 0.13177875264026598,
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
      "url": "http://127.0.0.1:51567/data/news",
      "host": "flaky.fides-demo.test",
      "amount": "0.01",
      "recipient": "0x5a3deb2084dacad4d4c3272563808e7e4977c3542265fc7698ba1fca8c57536a"
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
      "status": "complete",
      "evidenceId": "7667f1bb760a7a8df779fbe077b42766070202b2e60fae28f111e265ae6efd47",
      "verdict": "burned"
    }
  ]
};
