# go.greymetre.com - site v7 (one-click guide), 19-Nov-2026

**Bundle:** `Greymetre_Guides_Site_v7.zip` (built from v6; demo/ and replay/ and api/meeting.js unchanged).

## What changed
- `availability|range|reach|engagement/index.html`: when the URL carries `lid`, `e` and `k` (the cold email's
  "Send me the free guide" button), the form is replaced by one "Email me the guide" button. After the click the
  panel says "Thank you. Your guide will be mailed to you shortly at <email>." If the link fails verification, the
  normal form shows, pre-filled with name and email. Visits without those parameters see the v6 form, unchanged.
- `api/guide.js`: new `mode: "oneclick"` path. It verifies `k` (HMAC-SHA256 with `GUIDE_LINK_SECRET`) before
  sending anything, then sends the guide email from the sender's mailbox plus the usual "Guide download:" alert
  (same subject prefix and GUIDE_DOWNLOAD_JSON line, `source: "oneclick"`). Clicks under 0.7 s after page load are
  dropped as scanners. The form path is unchanged.

## Deploy steps (Vaibhav)
1. Vercel -> project -> Settings -> Environment Variables: add **`GUIDE_LINK_SECRET`** (Production) = the value
   Anadi sends you privately (it is the contents of `Code/.guide_link_secret`; never email it, never commit it).
2. Deploy the v7 bundle (same as v6: replace the files, keep `RESEND_API_KEY` and the other env vars).
3. If the env var is missing, one-click links fall back to the form (safe, but no one-click).

## Test after deploy (Anadi)
Open one of the 19-Nov test emails to anadi@greymetre.io, tap "Send me the free guide":
- page shows "Your free guide is ready ... Email me the guide" (no form)
- tap it -> "Thank you. Your guide will be mailed to you shortly at anadi@greymetre.io"
- within a minute: "Your guide: ..." in anadi@greymetre.io, "Guide download: Anadi, one click (...)" in anadi@greymetre.com
