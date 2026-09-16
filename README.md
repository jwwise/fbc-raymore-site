# faithbaptistraymore.org

A static replacement for the website of Faith Baptist Church of Raymore, Missouri,
intended for free hosting on GitHub Pages.

The current site runs Joomla 4, which requires PHP, MySQL, ongoing security patching,
and a hosting plan. This repository first captures that site's content, then rebuilds it
as plain static files.

## Status

- [x] Content captured from the live site (16 pages, 43 images)
- [x] Content converted to Markdown
- [x] Static site design decided — Eleventy, no JavaScript, GitHub Pages
- [x] Static site built (15 pages)
- [ ] Enable GitHub Pages on the repository (Settings → Pages → source: GitHub Actions)
- [ ] Church review of content
- [ ] DNS cut over

## Building

Requires Node 18 or newer.

```powershell
npm install
npm run build     # -> _site/
npm run serve     # preview at http://localhost:8080
```

Pushing to `main` builds and publishes automatically via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Layout

| Path | Contents |
| --- | --- |
| `src/` | The new site — Eleventy templates, CSS, images, and site data |
| `archive/` | Verbatim snapshot of the old Joomla site — raw HTML, images, crawl manifest |
| `content/` | The old pages as clean Markdown; the record the rebuild is checked against |
| `tools/` | The capture and conversion scripts |

## Editing content

Most routine changes are a single edit, and can be made in the GitHub web UI
without installing anything:

| To change | Edit |
| --- | --- |
| Service times, address, phone, social links | [src/_data/church.json](src/_data/church.json) |
| Any page's wording | the matching file under `src/` |
| Colors, spacing, type | [src/assets/css/site.css](src/assets/css/site.css) |

## Re-running the capture of the old site

```powershell
npm run capture
npm run extract
```

The crawler skips the Joomla sermon library (1,609 generated pages); see
[CLAUDE.md](CLAUDE.md) for why, and for what still needs deciding about the
sermon audio before the old host is cancelled.
