# CLAUDE.md

## Purpose

Replace the website for **Faith Baptist Church of Raymore, Missouri**
(<https://www.faithbaptistraymore.org/>) with a **static site hosted on GitHub Pages**
— no PHP, no database, no paid hosting.

The current site runs Joomla 4 with the Helix Ultimate template, the DJ Image Slider
module, and the SermonSpeaker component. That stack is the thing being retired: it needs
patching, a MySQL database, and a hosting bill, and the people who maintain the site are
church volunteers, not developers.

Two hard constraints follow from that, and they drive most decisions here:

1. **No server-side anything.** Anything that needs a backend (the contact form, site
   search, sermon audio streaming) has to become a static equivalent or a third-party
   embed.
2. **A non-developer has to be able to update it.** Service times, staff, and event
   details change. Editing a Markdown/YAML file through the GitHub web UI is the
   expected workflow — not a local toolchain.

## Repository layout

| Path | What it is |
| --- | --- |
| `archive/html/` | Raw HTML of every page of the live Joomla site, as captured. **Read-only reference.** |
| `archive/images/` | Every image referenced by those pages (42 files). |
| `archive/manifest.json` | Crawl metadata: URLs, HTTP status, titles, byte counts. |
| `content/*.md` | The archived pages converted to Markdown with YAML front matter. This is the **source of truth for migrating copy** into the new site. |
| `tools/capture-site.ps1` | The crawler that produced `archive/`. Re-runnable. |
| `tools/extract-content.mjs` | Converts `archive/html/` → `content/`. Re-runnable. |

Regenerate the capture with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/capture-site.ps1
node tools/extract-content.mjs
```

## Facts captured from the live site

Verify against the church before publishing — some of this is stale on the current site.

**Location**
- Physical: 414 S. Franklin Street, Raymore, Missouri 64083
- Mailing: PO Box 313, Raymore, MO 64083 — *mail is not accepted at the physical location*
- Phone: (816) 322-0207
- The church bought 8.36 acres at E. Hubach Hill Rd. & S. Prairie Lane Rd. in July 2011
  with the intent to relocate. The current site never says whether that happened.

**Service times**
- Sunday School — 9:30 am
- Sunday Worship — 10:45 am
- Sunday Evening — 6:00 pm
- Wednesday Master Clubs — 6:45 pm
- Wednesday Adult/Youth Prayer & Bible Study — 7:00 pm

Note: the homepage omits Master Clubs from the Wednesday list; the contact page includes
it. The contact page is assumed correct.

**Staff**
- Pastor Michael Wessberg (senior pastor since February 2016)
- Jim Stephens, Music Director

Both staff email addresses were cloaked by Joomla's spam filter and **could not be
recovered** from the static HTML. They must be supplied by the church.

**Mission statement** — the five "I"s: *impact, instruct, include, involve, inspire*.

**Off-site properties**
- YouTube (live stream + archive): `https://www.youtube.com/channel/UCKesAFFfjb1aJjalSiEELQA`
- Facebook: `https://www.facebook.com/pages/Faith-Baptist-Church-of-Raymore/103920613037485`

## Known defects in the existing content

Carry these forward as fixes, not as faithful copies:

- **Mojibake.** The Joomla database holds UTF-8 bytes that were once decoded as Latin-1,
  so the live site renders `â€“` for en dashes and `Â ` for non-breaking spaces.
  `repairMojibake()` in `tools/extract-content.mjs` undoes this. The `content/` Markdown
  is clean; the `archive/html/` is not.
- **Wrong church name in the copy.** `content/ministries/missions.md` reads "how
  **Lakeside** is fulfilling its duty" — an unedited paste from another church's site.
- **Garbled sentence** in the same file: "With over one works scattered in all directions".
- **Sermon titles contain typos** in the source data: "reserection", "identitiy",
  "thr beaty of submission", "angles" (for "angels"), "hole/whole heart".
- The footer credits "Free Joomla templates by Ltheme" — drop it.

## The sermon library

The largest open question. The Joomla SermonSpeaker component holds **1,609 sermons**:

| Category | Count |
| --- | --- |
| Sunday Morning Service | 485 |
| Sunday Evening Service | 393 |
| Sunday School | 348 |
| Wednesday Evening Service | 301 |
| Special Services | 82 |

Indexed by ~60 speakers and by series. Audio is hosted on the Joomla server.

This is **deliberately excluded** from `archive/` — crawling 1,609 generated pages plus
their audio would dominate the repository, and GitHub Pages is a poor host for it
(1 GB soft limit, 100 GB/month bandwidth). Decide the destination for this content
separately before shutting the old site down; the audio files are the one asset that
cannot be re-created if the host is cancelled.

## Conventions

- Reproduce church copy **verbatim** except for the defects listed above. Scripture
  quotations are King James Version — do not modernise the wording or punctuation.
- This is an independent, fundamental Baptist congregation. Doctrinal statements in
  `content/about-us/what-we-believe.md` are precisely worded; never paraphrase them.
- Keep `archive/` byte-identical to what was captured. It is the record of what the old
  site said, and it is what a migration gets checked against.
