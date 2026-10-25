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

To be filled in once the repo is scaffolded (install, test, run merchants, run agent, run sim, run web).
