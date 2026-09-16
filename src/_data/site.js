/**
 * Where this build will actually be served from.
 *
 * GitHub Pages serves a project site under a subpath (`/fbc-raymore-site`), and
 * the eventual custom domain will serve it at the root. Rather than hard-code
 * either, the deploy workflow passes the real values in from
 * `actions/configure-pages`, so the same build works for both:
 *
 *   BASE_ORIGIN   https://faithbaptistraymore.github.io
 *   PATH_PREFIX   /fbc-raymore-site/
 *
 * With neither set (a local `npm run build`), the site builds for the root.
 */
import church from './church.json' with { type: 'json' };

const withSlashes = (p) => `/${String(p ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

const pathPrefix = withSlashes(process.env.PATH_PREFIX ?? '/');
const origin = (process.env.BASE_ORIGIN ?? church.url).replace(/\/+$/, '');

/**
 * The preview lives at a github.io URL that must not be indexed — it would
 * compete with the real church site for the same content. Once the custom
 * domain is set in Settings -> Pages, `configure-pages` reports that domain as
 * the origin, this flips to true on its own, and the noindex disappears.
 */
const isProduction = origin === church.url.replace(/\/+$/, '');

export default {
  origin,
  pathPrefix,
  /** Absolute base for canonical tags, og:url and sitemap entries. */
  baseUrl: origin + pathPrefix,
  isProduction,
};
