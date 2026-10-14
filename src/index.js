// heading-beacon: heading structure audit for built static sites. Louis Wright, MIT.
import { contentPages, runBeacon, finder, SITE_OPTIONS, SITE_HELP, siteOptions, ancestor } from './site.js';
import { buildReport, UsageError } from './core.js';

export * from './core.js';
export { SITE_OPTIONS, SITE_HELP, siteOptions };

export const RULES = {
  'h1-missing': { severity: 'high', title: 'Page has no visible <h1>' },
  'h1-multiple': { severity: 'medium', title: 'Page has more than one <h1>' },
  'heading-empty': { severity: 'high', title: 'Heading has no text (and no image alt text)' },
  'heading-level-skip': { severity: 'medium', title: 'Heading skips a level (e.g. <h2> followed by <h4>)' },
  'heading-before-h1': { severity: 'low', title: 'A lower-level heading appears before the <h1>' },
  'heading-generic': { severity: 'low', title: 'Heading text is generic or keyword-empty ("Introduction", "Read more", "Untitled")' },
  'heading-duplicate': { severity: 'low', title: 'The same heading text appears more than once at the same level on a page' },
  'heading-too-long': { severity: 'low', title: 'Heading is very long (default > 120 characters)' },
  'h1-too-short': { severity: 'low', title: '<h1> is a single short word (default < 3 characters or 1 word under 8)' },
  'h1-hidden': { severity: 'medium', title: 'The only <h1> is hidden (hidden attribute or inside a hidden element)' },
  'h1-title-mismatch': { severity: 'info', title: '<h1> shares no words with the <title>' },
  'h1-duplicate-site': { severity: 'low', title: 'Several pages share the same <h1>' },
  'heading-only-image': { severity: 'info', title: 'Heading text comes only from image alt text' },
  'heading-no-subheadings': { severity: 'info', title: 'Long page (default > 600 words) has no <h2>' },
};

const GENERIC = ['introduction', 'intro', 'overview', 'untitled', 'title', 'heading', 'header', 'read more', 'more', 'click here', 'welcome', 'home', 'page', 'section', 'new section', 'lorem ipsum', 'tbd', 'todo', 'test', 'subtitle', 'misc', 'other', 'details', 'info', 'information', 'content', 'main', 'text'];
const STOP = new Set('a an and are as at be by for from has have how i in is it its of on or our that the this to was we what when where which who why will with you your'.split(' '));
const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
export const contentWords = (s) => norm(s).split(' ').filter((w) => w && !STOP.has(w));
export const isGeneric = (s, extra = []) => { const n = norm(s); return !!n && ([...GENERIC, ...extra.map(norm)].includes(n) || /^(section|chapter|part|step|heading|title)\s*\d+$/.test(n) || /^lorem ipsum/.test(n)); };

export function analyze(site, opts = {}, config = {}) {
  const { findings, add } = finder(RULES);
  const maxLen = opts.maxLength ?? config.maxLength ?? 120;
  const longPage = opts.longPageWords ?? config.longPageWords ?? 600;
  const extraGeneric = [...(config.genericHeadings || []), ...(opts.genericHeadings || [])];
  const allowMultipleH1 = opts.allowMultipleH1 ?? config.allowMultipleH1 ?? false;
  const pages = contentPages(site);
  const h1s = new Map(); let total = 0;
  for (const pg of pages) {
    const at = (h) => ({ file: pg.file, line: h?.line });
    const hs = pg.doc.headings; total += hs.length;
    const visible = hs.filter((h) => !h.hidden);
    const h1 = visible.filter((h) => h.level === 1);
    const hiddenH1 = hs.filter((h) => h.level === 1 && h.hidden);
    if (!h1.length) {
      if (hiddenH1.length) add('h1-hidden', pg.path, `${pg.path}: the only <h1> ("${hiddenH1[0].text}") is hidden`, 'Make the main heading visible; hidden headings carry little weight and confuse screen-reader users.', at(hiddenH1[0]));
      else add('h1-missing', pg.path, `${pg.path} has no <h1>`, `Add one <h1> describing the page${pg.doc.title ? ` (e.g. "${pg.doc.title}")` : ''}.`, { file: pg.file });
    } else {
      if (h1.length > 1 && !allowMultipleH1) add('h1-multiple', pg.path, `${pg.path} has ${h1.length} <h1> elements: ${h1.map((h) => `"${h.text}"`).join(', ')}`, 'Keep one <h1> for the page topic; demote the others to <h2>.', at(h1[1]));
      const main = h1[0];
      const w = contentWords(main.text);
      if (main.text && (main.text.length < 3 || (w.length <= 1 && main.text.length < 8)) && !isGeneric(main.text, extraGeneric)) add('h1-too-short', pg.path, `<h1> "${main.text}" is very short`, 'Use a descriptive <h1> that says what the page is about.', at(main));
      if (pg.doc.title && w.length) { const tw = new Set(contentWords(pg.doc.title)); if (tw.size && !w.some((x) => tw.has(x))) add('h1-title-mismatch', pg.path, `<h1> "${main.text}" shares no words with <title> "${pg.doc.title}"`, 'Align the <h1> and <title> so both describe the same topic.', at(main)); }
      if (main.text) { const k = norm(main.text); if (!h1s.has(k)) h1s.set(k, []); h1s.get(k).push(pg); }
      const firstH1 = hs.indexOf(main);
      const before = visible.slice(0, visible.indexOf(main)).filter((h) => h.level > 1 && !ancestor(h.el, (n) => ['header', 'nav', 'aside', 'footer'].includes(n.tag)));
      if (before.length && firstH1 > 0) add('heading-before-h1', pg.path, `<h${before[0].level}> "${before[0].text}" comes before the <h1>`, 'Start the main content with the <h1>; move site-wide headings into <header>/<nav> or demote them.', at(before[0]));
    }
    let prev = 0; const seen = new Map();
    for (const h of visible) {
      const imgs = h.el.children?.length && !h.text.replace(/\s/g, '') ? true : false;
      if (!h.text) { add('heading-empty', pg.path, `Empty <h${h.level}>${imgs ? ' (image without alt text)' : ''}`, 'Add text to the heading, or remove it if it is only for styling.', at(h)); continue; }
      const own = h.el.children.some((c) => c.text != null && c.text.trim()) || h.el.children.some((c) => c.tag && c.tag !== 'img' && c.children?.length);
      if (!own && h.el.children.some((c) => c.tag === 'img')) add('heading-only-image', pg.path, `<h${h.level}> "${h.text}" is only an image`, 'Use real text in headings so search engines and assistive tech read it reliably.', at(h));
      if (prev && h.level > prev + 1) add('heading-level-skip', pg.path, `<h${h.level}> "${h.text}" follows <h${prev}>, skipping ${Array.from({ length: h.level - prev - 1 }, (_, k) => `h${prev + k + 1}`).join('/')}`, `Use <h${prev + 1}> here, or add the missing level.`, at(h));
      if (isGeneric(h.text, extraGeneric)) add('heading-generic', pg.path, `<h${h.level}> "${h.text}" is generic`, 'Say what the section is about using the words people search for.', at(h));
      if (h.text.length > maxLen) add('heading-too-long', pg.path, `<h${h.level}> is ${h.text.length} characters: "${h.text.slice(0, 60)}…"`, `Shorten it to under ${maxLen} characters; move detail into the paragraph.`, at(h));
      const k = `${h.level}:${norm(h.text)}`;
      if (h.level > 1 && seen.has(k)) add('heading-duplicate', pg.path, `<h${h.level}> "${h.text}" repeats (first on line ${seen.get(k)})`, 'Make each section heading distinct.', at(h)); else seen.set(k, h.line);
      prev = h.level;
    }
    if (visible.length && !visible.some((h) => h.level === 2) && pg.doc.words().length > longPage) add('heading-no-subheadings', pg.path, `${pg.path} has ${pg.doc.words().length} words and no <h2>`, 'Break long content into sections with <h2> headings.', { file: pg.file });
  }
  for (const [, list] of h1s) if (list.length > 1 && !(config.allowDuplicateH1 ?? false)) add('h1-duplicate-site', list[0].doc.headings.find((h) => h.level === 1).text, `${list.length} pages share the <h1> "${list[0].doc.headings.find((h) => h.level === 1).text}": ${list.slice(0, 5).map((p) => p.path).join(', ')}${list.length > 5 ? ', …' : ''}`, 'Give each page a unique <h1>.', { file: list[1].file });
  return { findings, info: { headings: total }, summary: `${pages.length} page(s); ${total} heading(s)${site.baseUrl ? ` at ${site.baseUrl}` : ''}` };
}

export function check(dir, opts = {}, config = {}, configFile) {
  const tool = { name: 'heading-beacon', version: opts.toolVersion || '1.0.0', rules: RULES, emoji: '🔠', defaultFile: 'index.html' };
  return runBeacon(tool, dir, { ...opts, UsageError }, config, configFile, analyze, buildReport);
}
