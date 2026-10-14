# Changelog

## 1.0.0 (2026-10-14)

First release, by Louis Wright.

- H1 checks: missing, multiple, hidden, very short, no overlap with `<title>`, duplicated across pages.
- Hierarchy: skipped levels, headings before the H1 in main content, long pages without `<h2>`.
- Quality: empty, image-only, generic/keyword-empty, duplicate and overlong headings; configurable generic list.
- Supports `role="heading"`/`aria-level` and hidden ancestors.
- Text/JSON/SARIF/Markdown output, `--fail-on`, exit codes 0/1/2, allowlist with expiry, severity overrides.
- Composite GitHub Action with job summary.
