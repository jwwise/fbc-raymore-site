# faithbaptistraymore.org

A static replacement for the website of Faith Baptist Church of Raymore, Missouri,
intended for free hosting on GitHub Pages.

The current site runs Joomla 4, which requires PHP, MySQL, ongoing security patching,
and a hosting plan. This repository first captures that site's content, then rebuilds it
as plain static files.

## Status

- [x] Content captured from the live site (16 pages, 42 images)
- [x] Content converted to Markdown
- [ ] Static site design decided
- [ ] Static site built
- [ ] Deployed to GitHub Pages
- [ ] DNS cut over

## Layout

| Path | Contents |
| --- | --- |
| `archive/` | Verbatim snapshot of the live Joomla site — raw HTML, images, crawl manifest |
| `content/` | The same pages as clean Markdown; the source for the rebuild |
| `tools/` | The capture and conversion scripts |

## Re-running the capture

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/capture-site.ps1
node tools/extract-content.mjs
```

The crawler skips the Joomla sermon library (1,609 generated pages); see
[CLAUDE.md](CLAUDE.md) for why and for what still needs to be decided about it.
