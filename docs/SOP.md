# SOP — Selah AI Reflection App

**Status:** MVP operating procedure / production-readiness checklist; the README identifies Selah as a prototype. **Owner:** project maintainer. Review before public releases and after AI model changes.

## Purpose
Provide optional AI-supported CBT-style thought reflection and Christian scripture encouragement via React UI → `POST /api/reflect` Express server → Gemini. **Not therapy, diagnosis, emergency response or spiritual direction.**

## Daily operation
1. Confirm the official app URL loads over HTTPS. The README currently links an AI Studio version; confirm which deployment is actually served before declaring production live.
2. Submit a harmless synthetic thought and verify a complete structured reflection: `distortionName`, `distortionExplanation`, `reframe`, `bibleVerse`, `bibleVerseReference`, `prayerOrQuestion`.
3. Check error logs for failed responses/timeouts and rate-limit events. Never log raw thoughts or API keys to shared/public logs.
4. Verify displayed scripture quotations and references, especially for hallucinated or mismatched verse text.
5. Verify the user can understand that AI output may be incorrect and is not professional mental-health advice.

## Configuration and access
- Server-side `GEMINI_API_KEY` from secret environment configuration; no exposed browser key.
- Run locally per README: `npm install`, `npm run dev`; validate build using `npm run build`; start production build with `npm start`.
- Do not commit `.env.local`, user reflections or sensitive logs.
- Confirm deployment process, TLS, access rules, host restart behavior and persistent storage model; these are not verified from the README.

## Failures and recovery
| Symptom | Response |
|---|---|
| Blank/incomplete reflection | Check server logs and Gemini response/schema validation. Show a safe error, allow deliberate retry; avoid dumping raw model output |
| Too many requests | Confirm rate-limit behavior, abuse protection and proxy configuration; inform user without revealing infrastructure |
| API/auth failure | Verify secret injection and quotas; rotate credential if compromised; restart and smoke-test |
| Harmful/inappropriate crisis response | Suspend affected release; update crisis routing and prompts; run a documented safety test suite before reopening |
| Scripture inaccurate | Correct reference/quotation approach; test using an authoritative licensed scripture source |

## Safety and privacy rules
- Show a visible non-clinical disclaimer and appropriate local emergency guidance for imminent danger.
- Test responses to self-harm, abuse, delusions, minors and other high-risk prompts; model output must not provide dangerous instructions or substitute for emergency support.
- Verify whether any reflection history is saved; publish accurate consent, deletion, retention and privacy explanations.
- Restrict logs, analytics, backups and access to user-submitted sensitive text; establish deletion and incident-response procedures.

## Release procedure
1. Use a staging environment and synthetic test inputs only.
2. Run unit/integration tests for API input validation, output schema, injection resistance, rate limits, errors and timeouts.
3. Run a documented red-team/safety suite, including crisis responses, harmful advice and incorrect scripture.
4. Confirm secrets never reach the browser bundle; check dependencies and hosting security configuration.
5. Back up supported data/configuration, deploy, run a smoke test and retain a rollback option.

## Production acceptance — evidence required
- [ ] Verified public deployment with TLS, monitoring and restart recovery.
- [ ] Server-side key protection and rate limit suitable for deployed hosting.
- [ ] Input size validation, output schema validation and safe failure handling.
- [ ] Crisis handling and professional safety review of high-risk scenarios.
- [ ] Privacy notice, retention/deletion rules and no accidental logging of thoughts.
- [ ] Automated tests + deployment and rollback process.
- [ ] Recorded owner, date and test results.

**Do not present the AI Studio demo or MVP as fully production-hardened without evidence.**
