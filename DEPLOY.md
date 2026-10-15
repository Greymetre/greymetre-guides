# Guide landing pages: go live (15-Oct-2026)

Live address: **https://go.greymetre.com** (same domain as our sending mailboxes, so links match the sender and are less likely to be filtered).

| Page | URL |
|---|---|
| Range | https://go.greymetre.com/range |
| Availability | https://go.greymetre.com/availability |
| Reach | https://go.greymetre.com/reach |
| Engagement | https://go.greymetre.com/engagement |
| Privacy policy (linked from the form) | https://go.greymetre.com/privacy |
| Guide PDFs | https://go.greymetre.com/guides/*.pdf |

Everything is in `site/`: 4 landing pages, 4 guide PDFs, the privacy page, and `api/guide.js` (the form handler, which sends through Resend).

## 1. Deploy (about 10 minutes, from a Mac Terminal)

```bash
cd "<this folder>/site"
npx vercel@latest login              # once, with the greymetre Google/GitHub account
npx vercel@latest --prod             # project name: greymetre-guides, accept defaults
npx vercel@latest env add RESEND_API_KEY production    # paste the key from Code/config.yaml (resend.api_key)
npx vercel@latest env add SITE_URL production          # https://go.greymetre.com
npx vercel@latest --prod             # redeploy so the env vars are picked up
npx vercel@latest domains add go.greymetre.com
```

## 2. DNS (2 minutes, where greymetre.com DNS is managed: the same place the Resend records were added)

| Type | Name | Value |
|---|---|---|
| CNAME | `go` | `cname.vercel-dns.com` |

Vercel issues the HTTPS certificate automatically once the CNAME resolves (usually a few minutes).

## 3. Test before any send (5 minutes)

1. Open `https://go.greymetre.com/availability?lid=TEST-001&m=anadi_main` on a phone.
2. Fill the form with your own email and tick consent.
3. Within a minute you should see:
   - the thank-you panel with a working **Download PDF** button;
   - in your inbox, **"Your guide: Five Signs Your Inventory Planning…"** from Anadi Shrivastava <anadi@greymetre.com>;
   - in anadi@greymetre.com, the alert **"Guide download: <you>, <company> (availability)"**.
4. Repeat once with `m=subodh_main` and once with `m=asit_main` to confirm each sender works.
5. In Resend > Emails, both messages carry tags `type`, `lever`, `lid`, `mailbox`.

If the guide email does not arrive, check Vercel > Project > Logs for `guide email failed`; the alert email then says "NO - send the PDF manually".

## How a download is tracked

- **Email link** (built by the composer): `https://go.greymetre.com/<lever>?lid=<Lead_ID>&m=<mailbox_id>`; mailbox_id is `anadi_main`, `asit_main` or `subodh_main`, exactly as in config.yaml. Only IDs travel in the URL, never personal data.
- **Form submit** -> `api/guide` -> guide email to the prospect from the same mailbox that sent the cold email (tagged `type=guide_download`), plus an alert to that mailbox with the details and a `GUIDE_DOWNLOAD_JSON:` line.
- **Sync**: `python3 scripts/guide_downloads_sync.py` (copy it into `Code/scripts/`) reads the alerts over IMAP and appends to `Code/data/guide_downloads.csv`. The EOD reconcile stamps Mother from that CSV through `safe_write.py`: Response? = Guide download, lever, date.
- Replies to the guide email land in the rep's own mailbox, so the existing reply ingest sees them.

## Optional env vars

- `LOG_EMAIL`: extra copy of every alert (for example a shared inbox).
- `RESEND_AUDIENCE_ID`: also add each downloader to a Resend audience.
