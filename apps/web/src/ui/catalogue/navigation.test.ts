import { afterEach, describe, expect, it, vi } from 'vitest'

import { moveInCatalogueGrid, readGridColumnCount } from '#ui/catalogue/navigation'

describe('moveInCatalogueGrid (043)', () => {
  // Two groups on a 4-column grid: 6 cards (rows of 4 + 2) then 5 cards.
  const counts = [ 6, 5 ]

  it('moves left / right in reading order across groups', () => {
    expect(moveInCatalogueGrid(counts, { group: 0, index: 5 }, 'ArrowRight', 4)).toEqual({ group: 1, index: 0 })
    expect(moveInCatalogueGrid(counts, { group: 1, index: 0 }, 'ArrowLeft', 4)).toEqual({ group: 0, index: 5 })
    expect(moveInCatalogueGrid(counts, { group: 0, index: 0 }, 'ArrowLeft', 4)).toBeNull()
    expect(moveInCatalogueGrid(counts, { group: 1, index: 4 }, 'ArrowRight', 4)).toBeNull()
  })

  it('moves up / down in the same column and crosses group edges to the nearest column', () => {
    expect(moveInCatalogueGrid(counts, { group: 0, index: 1 }, 'ArrowDown', 4)).toEqual({ group: 0, index: 5 })
    expect(moveInCatalogueGrid(counts, { group: 0, index: 5 }, 'ArrowDown', 4)).toEqual({ group: 1, index: 1 })
    expect(moveInCatalogueGrid(counts, { group: 0, index: 3 }, 'ArrowDown', 4)).toEqual({ group: 0, index: 5 })
    expect(moveInCatalogueGrid(counts, { group: 1, index: 3 }, 'ArrowUp', 4)).toEqual({ group: 0, index: 5 })
    expect(moveInCatalogueGrid(counts, { group: 1, index: 0 }, 'ArrowUp', 4)).toEqual({ group: 0, index: 4 })
    expect(moveInCatalogueGrid(counts, { group: 0, index: 5 }, 'ArrowUp', 4)).toEqual({ group: 0, index: 1 })
    expect(moveInCatalogueGrid(counts, { group: 0, index: 2 }, 'ArrowUp', 4)).toBeNull()
    expect(moveInCatalogueGrid(counts, { group: 1, index: 4 }, 'ArrowDown', 4)).toBeNull()
  })

  it('skips groups without visible cards', () => {
    expect(moveInCatalogueGrid([ 2, 0, 3 ], { group: 0, index: 1 }, 'ArrowDown', 4)).toEqual({ group: 2, index: 1 })
    expect(moveInCatalogueGrid([ 2, 0, 3 ], { group: 2, index: 0 }, 'ArrowLeft', 4)).toEqual({ group: 0, index: 1 })
  })

  it('goes to the first / last card with Home / End and ignores other keys', () => {
    expect(moveInCatalogueGrid(counts, { group: 0, index: 3 }, 'End', 4)).toEqual({ group: 1, index: 4 })
    expect(moveInCatalogueGrid(counts, { group: 1, index: 3 }, 'Home', 4)).toEqual({ group: 0, index: 0 })
    expect(moveInCatalogueGrid(counts, { group: 1, index: 3 }, 'a', 4)).toBeNull()
  })
})

describe('readGridColumnCount', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('counts the computed column tracks and falls back to one column', () => {
    const element = document.createElement('div')
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ gridTemplateColumns: '300px 300px 300px' } as CSSStyleDeclaration)
    expect(readGridColumnCount(element)).toBe(3)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ gridTemplateColumns: '' } as CSSStyleDeclaration)
    expect(readGridColumnCount(element)).toBe(1)
    expect(readGridColumnCount(null)).toBe(1)
  })
})
