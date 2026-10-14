import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { check, isGeneric, contentWords, RULES } from '../src/index.js';

const fx = (n) => new URL(`./fixtures/${n}`, import.meta.url).pathname;
const rules = (r) => r.findings.map((f) => f.rule);
const site = (files) => { const d = mkdtempSync(join(tmpdir(), 'hb-')); for (const [p, c] of Object.entries(files)) { mkdirSync(join(d, p, '..'), { recursive: true }); writeFileSync(join(d, p), c); } return d; };
const page = (body, title = 'Widget guide') => `<!doctype html><html lang="en"><head><title>${title}</title></head><body>${body}</body></html>`;

test('good fixture is clean at --fail-on low', () => { assert.deepEqual(check(fx('good')).findings, []); });
test('bad fixture reports every rule', () => {
  const r = rules(check(fx('bad')));
  for (const k of Object.keys(RULES)) assert.ok(r.includes(k), k);
});
test('header/nav headings before the h1 are fine', () => {
  assert.deepEqual(rules(check(site({ 'a.html': page('<header><h3>Brand</h3></header><main><h1>Widget guide</h1><h2>Sizes</h2></main>') }))), []);
});
test('level skip is measured from the previous heading, going up is fine', () => {
  const r = check(site({ 'a.html': page('<h1>Widget guide</h1><h2>A part</h2><h3>B part</h3><h2>C part</h2><h5>D part</h5>') }));
  assert.deepEqual(rules(r), ['heading-level-skip']); assert.match(r.findings[0].message, /skipping h3\/h4/);
});
test('role=heading with aria-level counts', () => {
  assert.deepEqual(rules(check(site({ 'a.html': page('<div role="heading" aria-level="1">Widget guide</div><h2>More widgets</h2>') }))), []);
});
test('options: allowMultipleH1, maxLength, extra generic, config', () => {
  const d = site({ 'a.html': page('<h1>Widget guide one</h1><h1>Widget guide two</h1><h2>Specs and sizes</h2>') });
  assert.ok(rules(check(d)).includes('h1-multiple'));
  assert.ok(!rules(check(d, { allowMultipleH1: true })).includes('h1-multiple'));
  assert.ok(rules(check(d, { maxLength: 5 })).includes('heading-too-long'));
  assert.ok(rules(check(d, { genericHeadings: ['Specs and sizes'] })).includes('heading-generic'));
  assert.ok(!rules(check(d, {}, { allowMultipleH1: true })).includes('h1-multiple'));
});
test('helpers', () => {
  assert.ok(isGeneric('Introduction')); assert.ok(isGeneric('Section 3')); assert.ok(isGeneric('  Read more! ')); assert.ok(!isGeneric('Introduction to widgets'));
  assert.deepEqual(contentWords('The best of the widgets'), ['best', 'widgets']);
});
test('allowlist and severity overrides', () => {
  const d = site({ 'a.html': page('<p>none</p>') });
  const r = check(d, { now: new Date('2026-10-14') }, { allowlist: [{ rule: 'h1-missing', file: 'a.html', reason: 'landing page', expires: '2027-01-01' }] });
  assert.equal(r.findings.length, 0); assert.equal(r.suppressed.length, 1);
  assert.equal(check(d, {}, { severity: { 'h1-missing': 'low' } }).findings[0].severity, 'low');
});
test('CLI exit codes and formats', () => {
  const bin = new URL('../bin/heading-beacon.js', import.meta.url).pathname;
  const run = (...a) => spawnSync(process.execPath, [bin, ...a], { encoding: 'utf8' });
  assert.equal(run(fx('good'), '--fail-on', 'low').status, 0);
  assert.equal(run(fx('bad')).status, 1);
  assert.equal(run(fx('bad'), '--fail-on', 'none').status, 0);
  assert.equal(run('/nonexistent-dir-xyz').status, 2);
  assert.equal(run(fx('good'), '--max-length', 'abc').status, 2);
  const s = JSON.parse(run(fx('bad'), '--format', 'sarif', '--fail-on', 'none').stdout); assert.equal(s.version, '2.1.0'); assert.ok(s.runs[0].results.length > 10);
  assert.match(run(fx('bad'), '--format', 'markdown', '--fail-on', 'none').stdout, /\| Severity \|/);
});
