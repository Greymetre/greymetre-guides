# Site v8.1: one more brief (25-Nov-2026)

For Vaibhav. Deploy `Greymetre_Guides_Site_v8_1.zip` exactly like v8. It is v8 with one brief added; nothing else changes.

## What is new
| Path | What it is |
|---|---|
| `brief/ceo_oem.html` | The MD / CEO brief for OEM and B2B manufacturers, served at `https://go.greymetre.com/brief/ceo_oem` |
| `briefs/Greymetre_Brief_MD_CEO_OEM_B2B.pdf` | Its PDF |
| `briefs/img/ceo_oem_teaser.jpg`, `ceo_oem_p1.jpg`, `ceo_oem_p2.jpg` | The email image and the two pages shown on the brief page |
| `api/brief.js` | One line added: `ceo_oem` is now a known brief, so its opens and downloads are tracked |

## Environment
Nothing new. Do NOT change `GUIDE_LINK_SECRET`.

## After deploying, check (2 minutes)
1. `https://go.greymetre.com/brief/ceo_oem` opens and shows both pages; **Download the PDF** gives `Greymetre_Brief_MD_CEO_OEM_B2B.pdf`.
2. `https://go.greymetre.com/briefs/img/ceo_oem_teaser.jpg` loads.
3. `https://go.greymetre.com/brief/supply` and `/availability` still work.
