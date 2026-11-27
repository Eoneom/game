/// <reference types="node" />
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Slice 040 guard: keeps the semantic type scale, the 12 px floor and the flat
 * data surfaces from regressing. Scans `apps/web/src/**\/*.{ts,tsx,css}`.
 */

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

interface Violation {
  file: string
  line: number
  match: string
  message: string
}

interface LineRule {
  id: number
  message: string
  test: (line: string, file: string) => string | null
}

const firstMatch = (pattern: RegExp) => (line: string): string | null => line.match(pattern)?.[0] ?? null

const ARBITRARY_SIZE = /(?<![\w-])text-\[\d*\.?\d+(px|rem|em)\]/
const RAW_SIZE = /(?<![\w-])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/
const FONT_SIZE_EXPRESSION = /fontSize\s*[=:]\s*(\{[^}]*\}|[^,;\n}]+)/g
const CSS_FONT_SIZE = /font-size:\s*([\d.]+)(px|rem)/g
const TEXTURE = /(?<![\w-])(scanlines|surface-inset|surface-chrome)(?![\w-])|(?<![\w-])bg-tex-|var\(--background-image-tex-/
const COPPER_TEXT = /(?<![\w-])(hover:)?text-copper(?![\w-])/

/** Numbers of a `fontSize` expression in px (`0.75rem` → 12). */
const fontSizeNumbers = (expression: string): number[] =>
  [ ...expression.matchAll(/(\d*\.?\d+)\s*(rem|em|px)?/g) ].map(([ , value, unit ]) =>
    unit === 'rem' || unit === 'em' ? Number(value) * 16 : Number(value)
  )

const lineRules: LineRule[] = [
  { id: 1, message: 'Use a text-* token (040).', test: firstMatch(ARBITRARY_SIZE) },
  { id: 2, message: 'Raw size class: map it with the 040 table.', test: firstMatch(RAW_SIZE) },
  {
    id: 3,
    message: 'Canvas text below 12 px.',
    test: line => {
      for (const [ match, expression ] of line.matchAll(FONT_SIZE_EXPRESSION)) {
        if (fontSizeNumbers(expression).some(size => size < 12)) return match
      }
      return null
    },
  },
  {
    id: 4,
    message: 'CSS font size below 12 px.',
    test: (line, file) => {
      if (!file.endsWith('.css')) return null
      for (const [ match, value, unit ] of line.matchAll(CSS_FONT_SIZE)) {
        const size = Number(value)
        if (unit === 'px' ? size < 12 : size < 0.75) return match
      }
      return null
    },
  },
  { id: 5, message: 'Texture behind text (040).', test: firstMatch(TEXTURE) },
  { id: 6, message: 'copper fails AA as text.', test: firstMatch(COPPER_TEXT) },
]

/**
 * Texture references allowed by rule 5: the `body` backdrop and the `@theme`
 * block of `index.css`, and the decorative backdrop div of the auth screen.
 */
const textureAllowed = (file: string, line: string, blocks: string[]): boolean => {
  if (file === 'index.css') {
    return blocks.includes('@theme') || blocks[blocks.length - 1] === 'body'
  }
  if (file === 'modules/auth/screen.tsx') {
    return line.includes('var(--background-image-tex-')
  }
  return false
}

/** Scans one source file; `file` is relative to `apps/web/src` with `/` separators. */
const scanSource = (file: string, content: string): Violation[] => {
  const violations: Violation[] = []
  const blocks: string[] = []
  content.split('\n').forEach((line, index) => {
    for (const rule of lineRules) {
      const match = rule.test(line, file)
      if (!match) continue
      if (rule.id === 5 && textureAllowed(file, line, blocks)) continue
      violations.push({ file, line: index + 1, match, message: rule.message })
    }
    if (file.endsWith('.css')) {
      for (const char of line) {
        if (char === '{') blocks.push(line.slice(0, line.indexOf('{')).trim())
        if (char === '}') blocks.pop()
      }
    }
  })
  return violations
}

const listSources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listSources(full)
    if (!/\.(ts|tsx|css)$/.test(entry.name)) return []
    if (/\.(test|spec)\./.test(entry.name) || entry.name === 'routeTree.gen.ts') return []
    return [ full ]
  })

const format = (violations: Violation[]): string =>
  violations.map(v => `${v.file}:${v.line}: ${v.match} — ${v.message}`).join('\n')

describe('typography guard (040)', () => {
  it('finds no forbidden size, texture or copper text in apps/web/src', () => {
    const violations = listSources(SRC_DIR).flatMap(full =>
      scanSource(path.relative(SRC_DIR, full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8'))
    )
    expect(format(violations)).toBe('')
  })

  // `~` keeps Tailwind from generating CSS for the forbidden fixtures; stripped before scanning.
  const fixtures: { rule: number; file: string; bad: string; good: string }[] = [
    { rule: 1, file: 'ui/x.tsx', bad: '<p className="text~-[11px]">', good: '<p className="max-w-[72ch] text-caption">' },
    { rule: 1, file: 'ui/x.tsx', bad: '<p className="text~-[0.65rem] uppercase">', good: '<p className="tracking-wider text-caption uppercase">' },
    { rule: 2, file: 'ui/x.tsx', bad: '<p className="lg:text-sm">', good: '<p className="max-w-xs sm:grid-cols-2 text-meta">' },
    { rule: 2, file: 'ui/x.tsx', bad: "'[&_h3]:text-base !text-xs'", good: "'text-body context-sm'" },
    { rule: 3, file: 'map/x.tsx', bad: 'fontSize={emphasized ? 13 : 11}', good: 'fontSize={emphasized ? 14 : 12}' },
    { rule: 3, file: 'map/x.tsx', bad: "style={{ fontSize: '0.6rem' }}", good: "style={{ fontSize: '0.75rem' }}" },
    { rule: 4, file: 'x.css', bad: '  font-size: 10px;', good: '  font-size: 0.75rem;' },
    { rule: 4, file: 'x.css', bad: '  font-size: 0.65rem;', good: '  font-size: 12px;' },
    { rule: 5, file: 'App.tsx', bad: '<main className="surface-inset scanlines">', good: '<main className="surface-panel bg-chrome">' },
    { rule: 5, file: 'ui/x.tsx', bad: '<div className="surface-chrome bg~-tex-metal">', good: '<div className="surface-frame">' },
    { rule: 6, file: 'ui/x.tsx', bad: '<a className="hover:text~-copper">', good: '<a className="border-copper bg-copper/30 hover:text-ink">' },
  ]

  it.each(fixtures)('rule $rule flags « $bad » and accepts « $good »', ({ rule, file, bad, good }) => {
    const message = lineRules.find(r => r.id === rule)?.message
    expect(scanSource(file, bad.replace(/~/g, '')).map(v => v.message)).toContain(message)
    expect(scanSource(file, good)).toEqual([])
  })

  it('honours the texture allowlist', () => {
    const css = [
      '@theme {',
      "  --background-image-tex-rust: url('/ui/tex-rust-noise.png');",
      '}',
      '@layer base {',
      '  body {',
      '    background-image: var(--background-image-tex-rust);',
      '  }',
      '  .panel {',
      '    background-image: var(--background-image-tex-metal);',
      '  }',
      '}',
    ].join('\n')
    expect(scanSource('index.css', css).map(v => v.line)).toEqual([ 9 ])
    expect(scanSource('other.css', css).map(v => v.line)).toEqual([ 6, 9 ])

    const backdrop = "  'linear-gradient(180deg, #000, #111), var(--background-image-tex-metal)',"
    expect(scanSource('modules/auth/screen.tsx', backdrop)).toEqual([])
    expect(scanSource('modules/auth/screen.tsx', '<div className="scanlines">')).toHaveLength(1)
    expect(scanSource('modules/auth/login-form.tsx', backdrop)).toHaveLength(1)
  })
})
