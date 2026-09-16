# Archive — do not edit

A verbatim snapshot of <https://www.faithbaptistraymore.org/> (Joomla 4 / Helix Ultimate)
taken before the static rebuild.

- `html/` — raw HTML per page, at the path it was served from
- `images/` — every image the pages referenced, under its original `/images/` path
- `manifest.json` — source URL, capture timestamp, HTTP status, title and size per page

This directory is the record of what the old site said, and what the rebuild gets checked
against. Keep it byte-identical to what was captured; fix content problems in `content/`
or in the new site instead.

Note that the raw HTML contains the live site's mojibake (`â€“`, `Â `) — that is faithful
to the original. The cleaned text is in `content/`.

Regenerate with `tools/capture-site.ps1`. The crawler excludes the sermon library
(`/sermons/sermon|speaker|serie/...`) — 1,609 generated pages.
