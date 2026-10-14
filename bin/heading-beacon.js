#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { mainCli, check, RULES, SITE_OPTIONS, SITE_HELP, UsageError, splitList } from '../src/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const num = (v, n) => { if (v == null) return undefined; const x = Number(v); if (!(x > 0)) throw new UsageError(`--${n} must be a positive number`); return x; };
mainCli({
  name: 'heading-beacon', version: pkg.version, configKey: 'headingBeacon', rules: RULES,
  tagline: 'audit heading structure in your built static site',
  usage: 'Usage: heading-beacon [site-dir] [options]',
  help: `${SITE_HELP}Checks
      --max-length <n>         Report headings longer than n characters (default 120)
      --long-page-words <n>    Pages with more words than this need an <h2> (default 600)
      --generic <words>        Extra generic heading texts to flag (comma-separated)
      --allow-multiple-h1      Do not report pages with several <h1>
`,
  options: { ...SITE_OPTIONS, 'max-length': { type: 'string' }, 'long-page-words': { type: 'string' }, generic: { type: 'string', multiple: true }, 'allow-multiple-h1': { type: 'boolean' } },
  run: async ({ dir, values: o, config, configFile }) => check(dir, { cli: o, maxLength: num(o['max-length'], 'max-length'), longPageWords: num(o['long-page-words'], 'long-page-words'), genericHeadings: splitList(o.generic), allowMultipleH1: o['allow-multiple-h1'] || undefined, toolVersion: pkg.version }, config, configFile),
});
