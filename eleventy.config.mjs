/**
 * Eleventy configuration for faithbaptistraymore.org.
 *
 * Output is plain static files in _site/, deployable to GitHub Pages with no
 * server-side anything. See CLAUDE.md for the constraints behind that.
 */
export default function (eleventyConfig) {
  // Assets are copied through untouched — no asset pipeline to break.
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/static': '.' });

  eleventyConfig.addWatchTarget('src/assets/css/');

  /** Current year, for the footer copyright. */
  eleventyConfig.addShortcode('year', () => String(new Date().getFullYear()));

  /**
   * Groups the flat church.services list by day, preserving the order the days
   * first appear. Templates render service times in several places and none of
   * them should re-implement this.
   */
  eleventyConfig.addFilter('groupByDay', (services = []) => {
    const days = new Map();
    for (const service of services) {
      if (!days.has(service.day)) days.set(service.day, []);
      days.get(service.day).push(service);
    }
    return [...days].map(([day, items]) => ({ day, items }));
  });

  /**
   * Looks up a single service's time by name, so prose can reference e.g. the
   * Master Clubs start time without restating it. Returns '' if the service is
   * renamed or removed, rather than breaking the build.
   */
  eleventyConfig.addFilter('serviceTime', (services = [], name) => {
    return services.find((s) => s.name === name)?.time ?? '';
  });

  /** Absolute URL for canonical tags and social metadata. */
  eleventyConfig.addFilter('absoluteUrl', (path, base) => new URL(path, base).href);

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateFormats: ['njk', 'md', 'html'],
  };
}
