# heading-beacon

[![npm version](https://img.shields.io/npm/v/heading-beacon.svg)](https://www.npmjs.com/package/heading-beacon) [![CI](https://github.com/MrLouisWright/heading-beacon/actions/workflows/ci.yml/badge.svg)](https://github.com/MrLouisWright/heading-beacon/actions/workflows/ci.yml) [![Node](https://img.shields.io/node/v/heading-beacon.svg)](https://nodejs.org) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Audit the heading structure of your built static site: one visible H1 per page, a logical H1 → H2 → H3 outline, and headings that actually say something.

Headings are the outline search engines, answer engines and screen readers use to understand a page. Templates quietly break that outline: a logo wrapped in an `<h1>` adds a second H1, a card component jumps from `<h2>` to `<h4>`, a CMS leaves an empty `<h2>` behind, or every section is called "Overview". `heading-beacon` reads every built HTML page and reports the file, line, severity and a **concrete fix** for each problem, before you deploy.

CLI, library and GitHub Action. Node.js 18+, **zero runtime dependencies**. Works on any static build output (Astro, Next.js `output: 'export'`, Eleventy, Hugo, Jekyll, Docusaurus, VitePress, plain HTML) and runs offline: point it at the folder your build writes. By Louis Wright.

## Features

- **H1:** missing, more than one, hidden, very short, sharing no words with the `<title>`, and the same H1 on several pages.
- **Hierarchy:** skipped levels (`<h2>` → `<h4>`), lower-level headings before the H1 in the main content (headings in `<header>`, `<nav>`, `<aside>` and `<footer>` are ignored), and long pages with no `<h2>`.
- **Quality:** empty headings (including images without alt), image-only headings, generic or keyword-empty text ("Introduction", "Read more", "Section 3", lorem ipsum, plus your own list), duplicates at the same level, and overlong headings.
- Understands `role="heading"` with `aria-level`, `hidden` ancestors, `<template>` and inline SVG titles.
- Text/JSON/SARIF/Markdown output, `--fail-on`, exit codes 0/1/2, allowlist with expiry, severity overrides, GitHub Action with job summary.

### Scope

heading-beacon checks headings only. Duplicate titles and meta descriptions across pages are covered by duplicate-beacon, and question-style headings for answer engines by answer-beacon.

## Rules

| Rule | Default severity | What it means |
|---|---|---|
| `h1-missing` | high | Page has no visible <h1> |
| `h1-multiple` | medium | Page has more than one <h1> |
| `heading-empty` | high | Heading has no text (and no image alt text) |
| `heading-level-skip` | medium | Heading skips a level (e.g. <h2> followed by <h4>) |
| `heading-before-h1` | low | A lower-level heading appears before the <h1> |
| `heading-generic` | low | Heading text is generic or keyword-empty ("Introduction", "Read more", "Untitled") |
| `heading-duplicate` | low | The same heading text appears more than once at the same level on a page |
| `heading-too-long` | low | Heading is very long (default > 120 characters) |
| `h1-too-short` | low | <h1> is a single short word (default < 3 characters or 1 word under 8) |
| `h1-hidden` | medium | The only <h1> is hidden (hidden attribute or inside a hidden element) |
| `h1-title-mismatch` | info | <h1> shares no words with the <title> |
| `h1-duplicate-site` | low | Several pages share the same <h1> |
| `heading-only-image` | info | Heading text comes only from image alt text |
| `heading-no-subheadings` | info | Long page (default > 600 words) has no <h2> |
| `allowlist-expired` | medium | An allowlist entry is past its `expires` date |
| `allowlist-unused` | info | An allowlist entry matched nothing |

## Install and run

```bash
npx heading-beacon dist
npx heading-beacon dist --fail-on medium
npx heading-beacon _site --max-length 90 --generic "Our services,Learn more"
npx heading-beacon out --allow-multiple-h1 --format markdown > headings.md
```

Pages are mapped to URLs the way static hosts serve them: `index.html` → `/`, `blog/index.html` → `/blog/`, `about.html` → `/about.html` (or `/about` with `--clean-urls`). Pass `--base-url` with your public URL, or let it be inferred from canonical / `og:url` tags. Meta-refresh redirect stubs and `404.html` are skipped. `X-Robots-Tag` and `Link` headers are read from Netlify/Cloudflare `_headers` and `vercel.json`.

### Sample output

```text
heading-beacon — /workspace/heading-beacon/test/fixtures/bad
7 page(s); 18 heading(s)

HIGH     about.html /about.html has no <h1> [h1-missing]
         ↳ fix: Add one <h1> describing the page (e.g. "About Acme").
HIGH     index.html:1 Empty <h2> [heading-empty]
         ↳ fix: Add text to the heading, or remove it if it is only for styling.
HIGH     index.html:1 Empty <h2> (image without alt text) [heading-empty]
         ↳ fix: Add text to the heading, or remove it if it is only for styling.
MEDIUM   hidden.html:1 /hidden.html: the only <h1> ("Hidden page") is hidden [h1-hidden]
         ↳ fix: Make the main heading visible; hidden headings carry little weight and confuse screen-reader users.
MEDIUM   index.html:1 / has 2 <h1> elements: "Welcome", "Second main heading here" [h1-multiple]
```

## Options

```text
heading-beacon 1.0.0 — audit heading structure in your built static site

Usage: heading-beacon [site-dir] [options]

Site
      --base-url <url>        Public URL of the site, e.g. https://example.com (default: inferred from canonical/og:url)
      --include <globs>       Only check these pages (file or URL path globs, comma-separated)
      --exclude <globs>       Skip these pages
      --clean-urls            Pages are served without .html (about.html -> /about)
Checks
      --max-length <n>         Report headings longer than n characters (default 120)
      --long-page-words <n>    Pages with more words than this need an <h2> (default 600)
      --generic <words>        Extra generic heading texts to flag (comma-separated)
      --allow-multiple-h1      Do not report pages with several <h1>

Common
  -c, --config <file>     JSON config (default: .heading-beacon.json or "headingBeacon" in package.json)
  -f, --format <fmt>      text (default) | json | sarif | markdown
      --json <file>       Also write a JSON report
      --sarif <file>      Also write SARIF 2.1.0
      --markdown <file>   Also write Markdown (e.g. for a job summary)
      --fail-on <sev>     critical | high | medium | low | info | none (default: high)
      --list-rules        Print rules and default severities
      --no-fixes          Hide fix suggestions in text output
      --no-color          Disable colours
  -v, --version / -h, --help

Exit codes: 0 = passed, 1 = findings at or above --fail-on, 2 = usage, config or read error.
```

## Configuration and allowlist

Options can live in `.heading-beacon.json` (or a `"headingBeacon"` key in `package.json`, or `--config <file>`):

```json
{
  "failOn": "medium",
  "severity": {
    "h1-missing": "low"
  },
  "allowlist": [
    {
      "rule": "h1-multiple",
      "subject": "/landing/*",
      "reason": "Campaign landing pages use two H1s by design",
      "expires": "2027-03-31"
    }
  ],
  "maxLength": 120,
  "longPageWords": 600,
  "genericHeadings": [
    "Our services"
  ]
}
```

- **`severity`** changes a rule's severity, or turns it `"off"`.
- **`allowlist`** entries suppress matching findings. Each needs a `reason` and matches on any combination of `rule`, `file`, `subject` (globs with `*`) and `match` (a substring of the message). Add `expires` (`YYYY-MM-DD`) so the exception is time-boxed: once it lapses the finding comes back along with an `allowlist-expired` finding (medium). Entries that no longer match anything are reported as `allowlist-unused` (info).

Config can also set `baseUrl`, `include`, `exclude` and `cleanUrls`. The config file is looked up in the site directory first, then in the current directory, so `.heading-beacon.json` can live at your repository root. Other keys: `maxLength` (default 120), `longPageWords` (default 600), `genericHeadings` (extra texts to flag), `allowMultipleH1` and `allowDuplicateH1` (both default false).

## Output and exit codes

- `--format text` (default), `json`, `sarif` (SARIF 2.1.0 for GitHub code scanning) or `markdown` (for job summaries and PR comments). `--json`, `--sarif` and `--markdown` write extra report files in the same run.
- `--fail-on <severity>` sets the threshold (`critical`, `high`, `medium`, `low`, `info`, `none`; default `high`).
- Exit codes: **0** passed, **1** findings at or above `--fail-on`, **2** usage, config or read error.

## GitHub Action

```yaml
permissions:
  contents: read
  security-events: write   # only needed for the SARIF upload
jobs:
  heading-beacon:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with: { persist-credentials: false }
      - run: npm ci && npm run build   # produce the static site first
      - uses: MrLouisWright/heading-beacon@v1
        with:
          path: dist
          fail-on: high
          sarif: heading-beacon.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: heading-beacon.sarif }
```

| Input | Description | Default |
|---|---|---|
| `path` | Built site directory (e.g. dist, public, _site) | `.` |
| `base-url` | Public URL of the site, e.g. https://example.com | |
| `fail-on` | Failure threshold | `high` |
| `config` | Config file path | |
| `sarif` / `json` | Write SARIF / JSON report to this path | |
| `job-summary` | Add the Markdown report to the job summary | `true` |
| `args` | Extra CLI arguments | |

The action runs the bundled CLI with Node 20; it has no dependencies to install. Pin it to a commit SHA if your policy requires it.

## Library

```js
import { check, isGeneric } from "heading-beacon";
const report = check("dist", { maxLength: 100 });
console.log(report.counts);
isGeneric("Introduction"); // true
```

Types are included.

## Requirements

Node.js 18 or newer. Zero runtime dependencies.

## Support

If this project is useful to you, you can support its development with a donation: [Buy me a coffee](https://donate.stripe.com/aFa00lek3cvX4Ds2Fk9EI0b). It helps keep these tools maintained, documented and free for everyone.

## Licence

MIT © Louis Wright ([Louis Wright](https://github.com/MrLouisWright))
