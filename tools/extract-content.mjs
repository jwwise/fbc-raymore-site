/**
 * Extracts the editorial content out of the archived Joomla HTML in archive/html
 * and writes clean Markdown into content/.
 *
 * The old site's database stores UTF-8 bytes that were once read as Latin-1, so
 * the archived HTML is full of mojibake (`â€“` for an en dash, `Â ` for nbsp).
 * repairMojibake() undoes that round-trip before anything else runs.
 *
 * Usage: node tools/extract-content.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlRoot = join(root, 'archive', 'html');
const outRoot = join(root, 'content');

/** Re-decode text that was UTF-8 encoded and then read back as Latin-1. */
function repairMojibake(text) {
  if (!/[ÂÃâ€]/.test(text)) return text;
  const repaired = Buffer.from(text, 'latin1').toString('utf8');
  // A failed round-trip yields U+FFFD; in that case keep the original.
  return repaired.includes('�') ? text : repaired;
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', deg: '°', middot: '·', bull: '•', trade: '™',
};

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Pull out the innerHTML of the first element carrying `attr`, brace-matched by tag depth. */
function sliceElement(html, attr) {
  const open = html.indexOf(attr);
  if (open === -1) return null;
  const tagStart = html.lastIndexOf('<', open);
  const tagName = /^<\s*([a-z0-9]+)/i.exec(html.slice(tagStart))?.[1];
  if (!tagName) return null;
  const bodyStart = html.indexOf('>', open) + 1;

  const re = new RegExp(`<\\s*(/?)${tagName}\\b`, 'gi');
  re.lastIndex = bodyStart;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(bodyStart, m.index);
  }
  return html.slice(bodyStart);
}

/** Convert a fragment of the old site's HTML into Markdown. */
function htmlToMarkdown(fragment) {
  let s = fragment;

  // Drop non-content chrome entirely.
  s = s.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // Images -> Markdown, keeping the archived path so they can be re-sourced.
  s = s.replace(/<img\b([^>]*)>/gi, (_, attrs) => {
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] ?? '';
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? '';
    return src ? `\n\n![${alt}](${src})\n\n` : '';
  });

  // Links -> Markdown.
  s = s.replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const label = inner.replace(/<[^>]+>/g, '').trim();
    return label ? `[${label}](${href})` : '';
  });

  // Inline emphasis.
  s = s.replace(/<\/?(strong|b)\b[^>]*>/gi, '**');
  s = s.replace(/<\/?(em|i)\b[^>]*>/gi, '_');

  // Headings.
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return text ? `\n\n${'#'.repeat(Number(lvl))} ${text}\n\n` : '';
  });

  // Lists. Nesting on this site is one level deep, so a flat mapping is safe.
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${inner.trim()}`);
  s = s.replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n\n');

  // Block separators.
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|tr|table|section|blockquote)>/gi, '\n\n');
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');
  s = s.replace(/<\/(td|th)>/gi, ' | ');

  // Anything left is a wrapper we do not need.
  s = s.replace(/<[^>]+>/g, '');

  s = decodeEntities(s);

  // Normalise whitespace: trim lines, collapse blank runs, drop nbsp-only lines.
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');

  return s;
}

function textOf(html, re) {
  const m = re.exec(html);
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim() : '';
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// The sermon library is a generated Joomla component with ~1,600 entries; it is
// archived as raw HTML but not converted to per-page Markdown.
const isSermonLibrary = (rel) => rel.startsWith(`sermons${sep}`);

const pagesIndex = [];
let written = 0;

for (const file of walk(htmlRoot)) {
  const rel = relative(htmlRoot, file);
  if (isSermonLibrary(rel)) continue;

  const raw = repairMojibake(readFileSync(file, 'utf8'));

  const title = textOf(raw, /<title>([\s\S]*?)<\/title>/i).replace(/\s*-\s*Faith Baptist Church$/, '');
  const description = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(raw)?.[1] ?? '';

  const body = sliceElement(raw, 'itemprop="articleBody"');
  // The homepage is module-driven rather than a single article.
  const fallback = body ?? sliceElement(raw, 'id="sp-component"');
  const markdown = htmlToMarkdown(fallback ?? '');

  const slug = rel.replace(/\.html$/, '').split(sep).join('/');
  const outFile = join(outRoot, `${slug}.md`);
  mkdirSync(dirname(outFile), { recursive: true });

  const frontMatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `source_url: https://www.faithbaptistraymore.org/${slug === 'index' ? '' : slug}`,
    `description: ${JSON.stringify(decodeEntities(repairMojibake(description)))}`,
    '---',
    '',
  ].join('\n');

  writeFileSync(outFile, frontMatter + markdown + '\n', 'utf8');
  pagesIndex.push({ slug, title, chars: markdown.length });
  written++;
}

pagesIndex.sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`Wrote ${written} Markdown files to content/\n`);
for (const p of pagesIndex) {
  console.log(`  ${String(p.chars).padStart(6)}  ${p.slug}  — ${p.title}`);
}
