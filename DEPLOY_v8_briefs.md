# Site v8: function briefs (25-Nov-2026)

For Vaibhav. Deploy `Greymetre_Guides_Site_v8.zip` exactly like v7. It contains everything in v7, unchanged, plus the brief pages.

## What is new
| Path | What it is |
|---|---|
| `brief/supply.html`, `plant`, `sales`, `marketing`, `ceo`, `it` | Brief pages, served at `https://go.greymetre.com/brief/<fn>`. They show the two brief pages as images, a **Download the PDF** button and a **Book 30 minutes** button. No form. |
| `briefs/*.pdf` | The six brief PDFs. |
| `briefs/img/<fn>_teaser.jpg` | The image used inside the cold email (headline + the five problems). |
| `briefs/img/<fn>_p1.jpg`, `_p2.jpg` | The two pages shown on the brief page. |
| `api/brief.js` | Records who opened (4 seconds with the page visible) and who downloaded, from the signed link in the email, and emails the sending mailbox one alert per event. |
| `vercel.json` | noindex + cache headers for `/briefs/*.pdf`, noindex for `/brief/*`, and `/brief` and `/briefs` redirect to greymetre.io. |

## Environment
Nothing new. `api/brief.js` uses the same `RESEND_API_KEY` and `GUIDE_LINK_SECRET` that v7 already has in Production. Do NOT change `GUIDE_LINK_SECRET`: every guide and brief link already sent would stop verifying.

## After deploying, check (5 minutes)
1. `https://go.greymetre.com/brief/supply` opens and shows both pages; **Download the PDF** downloads `Greymetre_Brief_Supply_Chain.pdf`. Repeat on a phone.
2. `https://go.greymetre.com/briefs/img/supply_teaser.jpg` loads (the cold email depends on it).
3. Existing pages still work: `/availability`, `/reach`, `/range`, `/engagement`, `/demo`, `/replay`.
4. Anadi then sends a test brief email to himself, opens the link, waits 5 seconds and presses Download: the sending mailbox gets **"Brief opened: ..."** and **"Brief download: ..."**.

If the alerts do not arrive but the page works, the signature is not verifying: compare `GUIDE_LINK_SECRET` in Vercel with `Code/.guide_link_secret` (same fix as 20-Nov).
