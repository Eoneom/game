/// <reference types="node" />
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** Slice 040: WCAG 2.x contrast of the `@theme` palette of `index.css`. */

const INDEX_CSS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.css')

type Rgb = [number, number, number]

const readPalette = (): Record<string, Rgb> => {
  const css = fs.readFileSync(INDEX_CSS, 'utf8')
  const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
  const palette: Record<string, Rgb> = {}
  for (const [ , name, hex ] of theme.matchAll(/--color-([\w-]+):\s*#([0-9a-fA-F]{6})\s*;/g)) {
    palette[name] = [ 0, 2, 4 ].map(i => parseInt(hex.slice(i, i + 2), 16)) as Rgb
  }
  return palette
}

const channel = (value: number): number => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const luminance = ([ r, g, b ]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

const contrast = (a: Rgb, b: Rgb): number => {
  const [ hi, lo ] = [ luminance(a), luminance(b) ].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** `top` at `alpha` over `bottom` (e.g. `bg-copper/30` on `chrome-2`). */
const blend = (top: Rgb, alpha: number, bottom: Rgb): Rgb =>
  top.map((value, i) => Math.round(value * alpha + bottom[i] * (1 - alpha))) as Rgb

const palette = readPalette()
const color = (name: string): Rgb => {
  const value = palette[name]
  if (!value) throw new Error(`--color-${name} missing from the @theme block of index.css`)
  return value
}

const surfaces: Record<string, Rgb> = {
  chrome: color('chrome'),
  'chrome-2': color('chrome-2'),
  'chrome-3': color('chrome-3'),
  'copper/30 on chrome-2': blend(color('copper'), 0.3, color('chrome-2')),
  'danger-deep/50 on chrome-2': blend(color('danger-deep'), 0.5, color('chrome-2')),
}

const cases: { text: string; surface: string; min: number }[] = [
  ...[ 'ink', 'amber', 'amber-dim', 'label', 'terminal', 'danger' ].flatMap(text =>
    [ 'chrome', 'chrome-2', 'chrome-3' ].map(surface => ({ text, surface, min: 4.5 }))
  ),
  ...[ 'amber', 'ink' ].flatMap(text =>
    [ 'copper/30 on chrome-2', 'danger-deep/50 on chrome-2' ].map(surface => ({ text, surface, min: 4.5 }))
  ),
  { text: 'muted', surface: 'chrome', min: 4.5 },
  { text: 'muted', surface: 'chrome-2', min: 4.5 },
  { text: 'edge', surface: 'chrome', min: 3 },
  { text: 'edge', surface: 'chrome-2', min: 3 },
  { text: 'amber', surface: 'chrome-2', min: 3 },
]

describe('palette contrast (040)', () => {
  it('computes WCAG ratios', () => {
    expect(contrast([ 255, 255, 255 ], [ 0, 0, 0 ])).toBeCloseTo(21, 5)
    expect(contrast(color('copper'), color('chrome-2'))).toBeLessThan(4.5)
  })

  it.each(cases)('$text on $surface ≥ $min : 1', ({ text, surface, min }) => {
    expect(contrast(color(text), surfaces[surface])).toBeGreaterThanOrEqual(min)
  })
})
