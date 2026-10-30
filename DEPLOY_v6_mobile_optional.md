# Site v6 (30-Oct-2026): mobile number optional on every form

For Vaibhav. Deploy exactly as v5 (`npx vercel@latest --prod` from the unzipped folder). No new environment variables, no other changes.

## What changed

| File | Change |
|---|---|
| availability/, range/, reach/, engagement/, demo/, replay/ index.html | Mobile field labelled "(optional)" and no longer required. If someone types a number, it must still look like a mobile number. Demo/replay copy now says "we get in touch" instead of "we call you". |
| api/guide.js | Accepts a download with no mobile; a number that is given is still checked for 10 digits. Alert says "Mobile: not given - follow up by email" when blank. |
| api/meeting.js | Same rule. With no mobile, the confirmation email says "I will write to you" instead of "I will call you on ...", and the alert says "Mobile: not given - email them within one working day to book". |
| privacy/index.html | Lists mobile as optional. |

## Test after deploy (5 minutes)

1. https://go.greymetre.com/reach?lid=LID-90001&m=anadi_main - submit with your email and NO mobile: guide email arrives; anadi@greymetre.com gets the alert with "Mobile: not given".
2. https://go.greymetre.com/demo?utm_source=TEST-v6 - submit with NO mobile: confirmation says "I will write to you"; alert says "Mobile: not given".
3. Either page with "123" as the mobile: the form refuses it. With a real mobile: works as before.
