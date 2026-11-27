/** Position of a card among the visible cards of a grid: group index, then index in the group. */
interface CatalogueGridPosition {
  group: number
  index: number
}

const flatten = (counts: number[]): CatalogueGridPosition[] =>
  counts.flatMap((count, group) => Array.from({ length: count }, (_, index) => ({ group, index })))

const findGroup = (counts: number[], from: number, step: 1 | -1): number => {
  for (let group = from + step; group >= 0 && group < counts.length; group += step) {
    if (counts[group] > 0) {
      return group
    }
  }
  return -1
}

/**
 * Keyboard move in a grouped card grid (slice 043). `counts` holds the visible cards of each group,
 * `columns` the grid column count. ← / → follow reading order across groups; ↑ / ↓ keep the column and,
 * at a group edge, land on the nearest column of the previous / next group; Home / End go to the ends.
 * Returns `null` when the key is not a move or the move leaves the grid.
 */
export const moveInCatalogueGrid = (
  counts: number[],
  from: CatalogueGridPosition,
  key: string,
  columns: number
): CatalogueGridPosition | null => {
  const all = flatten(counts)
  if (all.length === 0) {
    return null
  }
  const cols = Math.max(1, columns)
  const flatIndex = all.findIndex(position => position.group === from.group && position.index === from.index)

  switch (key) {
    case 'ArrowLeft':
      return flatIndex > 0 ? all[flatIndex - 1] : null
    case 'ArrowRight':
      return flatIndex >= 0 && flatIndex < all.length - 1 ? all[flatIndex + 1] : null
    case 'Home':
      return all[0]
    case 'End':
      return all[all.length - 1]
    case 'ArrowDown': {
      const below = from.index + cols
      if (below < counts[from.group]) {
        return { group: from.group, index: below }
      }
      const lastRowStart = Math.floor((counts[from.group] - 1) / cols) * cols
      if (from.index < lastRowStart) {
        // Partial last row: drop to its last card.
        return { group: from.group, index: counts[from.group] - 1 }
      }
      const next = findGroup(counts, from.group, 1)
      if (next < 0) {
        return null
      }
      return { group: next, index: Math.min(from.index % cols, counts[next] - 1) }
    }
    case 'ArrowUp': {
      if (from.index - cols >= 0) {
        return { group: from.group, index: from.index - cols }
      }
      const previous = findGroup(counts, from.group, -1)
      if (previous < 0) {
        return null
      }
      const lastRowStart = Math.floor((counts[previous] - 1) / cols) * cols
      return { group: previous, index: Math.min(lastRowStart + (from.index % cols), counts[previous] - 1) }
    }
    default:
      return null
  }
}

/** Column count of a CSS grid from its computed `grid-template-columns` (one track per value). */
export const readGridColumnCount = (element: Element | null | undefined): number => {
  if (!element) {
    return 1
  }
  const template = window.getComputedStyle(element).gridTemplateColumns
  if (!template || template === 'none' || template.includes('repeat(')) {
    return 1
  }
  return Math.max(1, template.trim().split(/\s+/).length)
}
