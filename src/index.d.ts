import type { Report, Rule } from './core.js';
export * from './core.js';
export interface HeadingOptions {
  baseUrl?: string; include?: string[]; exclude?: string[]; cleanUrls?: boolean;
  /** Report headings longer than this (default 120). */
  maxLength?: number;
  /** Pages with more words need an <h2> (default 600). */
  longPageWords?: number;
  /** Extra generic heading texts. */
  genericHeadings?: string[];
  allowMultipleH1?: boolean;
  now?: Date; toolVersion?: string; [option: string]: unknown;
}
export declare const RULES: Record<string, Rule>;
export declare const SITE_OPTIONS: Record<string, { type: 'string' | 'boolean'; multiple?: boolean }>;
export declare const SITE_HELP: string;
export declare function check(dir: string, opts?: HeadingOptions, config?: Record<string, unknown>, configFile?: string): Report;
export declare function analyze(site: unknown, opts?: HeadingOptions, config?: Record<string, unknown>): { findings: Report['findings']; info: Record<string, unknown>; summary: string };
export declare function isGeneric(text: string, extra?: string[]): boolean;
export declare function contentWords(text: string): string[];
