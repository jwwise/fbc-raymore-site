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

## Decisions made

Settled 2026-09-16. Do not relitigate these without asking.

| Question | Decision |
| --- | --- |
| Generator | **Eleventy**, built and deployed by GitHub Actions on push to `main` |
| Sermon archive | **Not migrated.** Link out to the existing YouTube channel for both live stream and past sermons. |
| Contact form | **Removed.** Replaced with phone, both addresses, service times, and a map link — no third-party form service. |
| Visual design | **Fresh, modern redesign.** Keep the copy and photos; rebuild the presentation. Mobile-first, service times above the fold. |

Consequences worth remembering:

- Volunteers edit Markdown in `src/` through the GitHub web UI; Actions rebuilds and
  publishes. No local toolchain is required to make a content change.
- Site-wide facts (address, phone, service times, social links) live in **one** data file,
  `src/_data/church.json`, so a service-time change is a single edit. Never hard-code
  these into templates.
- The sermon audio on the old Joomla host is not preserved by this repo. The church has
  confirmed that **all recordings they care about keeping are already on YouTube**, so
  retiring the old host is not a data-loss risk. Resolved 2026-09-16; no longer a blocker
  for DNS cutover.

## Repository layout

| Path | What it is |
| --- | --- |
| `src/` | **The new site.** Eleventy input. |
| `src/_data/church.json` | Every site-wide fact: address, phone, service times, social links. |
| `src/_data/redirects.json` | Old Joomla URLs → new URLs, rendered as meta-refresh stubs. |
| `src/_includes/layouts/` | `base.njk` (shell), `page.njk` (prose pages), `redirect.njk`. |
| `src/_data/site.js` | Derives where this build is served from (see Deployment). |
| `src/assets/` | CSS and images, copied through verbatim. |
| `src/static/` | Files served from the site root (`.nojekyll`). |
| `src/robots.njk` | Generates `robots.txt`; differs between preview and production. |
| `src/sitemap.njk` | Generates `sitemap.xml`. |
| `eleventy.config.mjs` | Build config, `HtmlBasePlugin`, and the `groupByDay` / `serviceTime` / `absoluteUrl` filters. |
| `tools/run-with-env.mjs` | Portable `VAR=x cmd` for the preview npm scripts. |
| `archive/html/` | Raw HTML of every page of the live Joomla site, as captured. **Read-only reference.** |
| `archive/images/` | Every image referenced by those pages (43 files). |
| `archive/manifest.json` | Crawl metadata: URLs, HTTP status, titles, byte counts. |
| `content/*.md` | The archived pages converted to Markdown. The **record of what the old site said**; the rebuild is checked against it. |
| `tools/capture-site.ps1` | The crawler that produced `archive/`. Re-runnable. |
| `tools/extract-content.mjs` | Converts `archive/html/` → `content/`. Re-runnable. |

Build and preview (requires Node 18+; developed on Node 24 LTS):

```powershell
npm install
npm run build     # -> _site/
npm run serve     # http://localhost:8080
```

Regenerate the capture of the old site with:

```powershell
npm run capture
npm run extract
```

## Site structure

Old Joomla URLs are **preserved** wherever the page still exists, so existing
inbound links and search rankings survive the migration. Only two URLs changed,
and both have redirect stubs.

| URL | Source |
| --- | --- |
| `/` | `src/index.njk` |
| `/visit/` | `src/visit/index.njk` — new; replaces the old PHP contact form |
| `/about-us/` | `src/about-us/index.njk` |
| `/about-us/meet-our-staff/` | unchanged URL |
| `/about-us/what-we-believe/` | unchanged URL |
| `/about-us/our-history/` | unchanged URL |
| `/ministries/` and all children | unchanged URLs |
| `/sermons/` | now a page of links out to YouTube |
| `/about-us/contact-form/` | redirect stub → `/visit/` |
| `/search/` | redirect stub → `/` |

GitHub Pages cannot issue HTTP 3xx, which is why changed URLs get meta-refresh
stubs with `noindex` plus a canonical tag. Add new ones to
`src/_data/redirects.json`, not as hand-written files.

The ~1,609 old `/sermons/sermon/...` URLs are **not** redirected — there are too
many to enumerate. `/404.html` points those visitors at the YouTube channel
instead.

## Deployment

GitHub Pages is enabled on the repo with **source: GitHub Actions**. Pushing to `main`
runs `.github/workflows/deploy.yml`, which builds with Node 24 and uploads `_site/`.

### Two serving locations, one build

The site is served from a subpath while in preview and from the root once the custom
domain is live:

| Stage | URL |
| --- | --- |
| Preview (now) | `https://faithbaptistraymore.github.io/fbc-raymore-site/` |
| Production (later) | `https://www.faithbaptistraymore.org/` |

**Nothing needs to change in the repo at cutover.** The workflow runs
`actions/configure-pages` *before* the build and passes what it reports into the build:

```yaml
env:
  BASE_ORIGIN: ${{ steps.pages.outputs.origin }}
  PATH_PREFIX: ${{ steps.pages.outputs.base_path }}
```

`src/_data/site.js` turns those into `site.baseUrl`, `site.pathPrefix`, and
`site.isProduction`. Setting the custom domain in Settings → Pages changes what
`configure-pages` reports, and the next build picks it up.

Three consequences to understand before changing any of this:

- **Templates must keep writing plain root-relative paths** (`/assets/...`, `/visit/`).
  `HtmlBasePlugin` rewrites them all to sit under `pathPrefix` at build time. Do not
  hand-prefix URLs in templates — it would double up once the prefix is `/`.
- **`site.baseUrl`, never `church.url`**, for canonical tags, `og:url`, and
  `sitemap.xml`. `church.url` is the church's permanent public address and is what
  `isProduction` compares against; it is not necessarily where this build is served.
- **The preview is deliberately `noindex` plus `Disallow: /`** so the github.io copy
  cannot compete with the real church site for the same content. This is derived, not
  configured: it flips to indexable on its own when the origin matches `church.url`.
  Don't "fix" the missing sitemap on the preview — it is intentional.

Build locally for either target:

```powershell
npm run build                     # production, served at the root
npm run build:preview             # subpath build, noindex
npm run serve:preview             # http://localhost:8080/fbc-raymore-site/
```

### Custom domain

Because this publishes from a **custom Actions workflow**, a `CNAME` file is *not*
required and *is ignored*: "If you are publishing from a custom GitHub Actions workflow,
no `CNAME` file is created, and any existing `CNAME` file is ignored and is not
required." Set the domain in **Settings → Pages** only. Do not add a `CNAME` to
`src/static/`; it would do nothing and mislead the next person.

## Conventions for the new site

- **No JavaScript.** The mobile menu is a checkbox-and-CSS toggle. Keep it that
  way; there is nothing on this site that needs a script, and volunteers cannot
  debug one.
- **One stylesheet**, `src/assets/css/site.css`, with custom properties at the
  top. No framework, no preprocessor, no asset pipeline.
- Never hard-code a service time, phone number, or address in a template. Read it
  from `church.json`, using the `serviceTime` filter for a single service or
  `groupByDay` for a grouped list.
- Images are served at their original pixel size; there is no responsive-image
  pipeline. `logo.png` is a copy of the old site's `logo_final_whitetext.png`.

## Facts captured from the live site

Verify against the church before publishing — some of this is stale on the current site.

**Location**
- Physical: 414 S. Franklin Street, Raymore, Missouri 64083
- Mailing: PO Box 313, Raymore, MO 64083 — *mail is not accepted at the physical location*
- Phone: (816) 322-0207
- Email: pastor@faithbaptistraymore.org
- The church bought 8.36 acres at E. Hubach Hill Rd. & S. Prairie Lane Rd. in July 2011
  intending to relocate. **That property was later sold** and the congregation still
  meets on S. Franklin Street. The old site never reflected the sale, and the sale date
  is still unknown — `src/about-us/our-history.njk` therefore states the sale without a
  date. Add the date when the church supplies it; do not guess one.

**Service times**
- Sunday School — 9:30 am
- Sunday Worship — 10:45 am
- Sunday Evening — 6:00 pm
- Wednesday Master Clubs — 6:45 pm
- Wednesday Adult/Youth Prayer & Bible Study — 7:00 pm

Note: the homepage omits Master Clubs from the Wednesday list; the contact page includes
it. The contact page is assumed correct.

**Staff**
- Pastor Michael Wessberg (senior pastor since February 2016) — pastor@faithbaptistraymore.org
- Jim Stephens, Music Director — no email address yet; his block lists the church phone only

Both staff email addresses were cloaked by Joomla's spam filter and could not be recovered
from the static HTML. The church supplied the pastor's; **Jim Stephens' is still
outstanding.**

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
