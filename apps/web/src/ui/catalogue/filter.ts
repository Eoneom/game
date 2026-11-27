import { useCallback, useState } from 'react'

import { CatalogueKind } from '#ui/catalogue/state'

/** Settings scope: one per catalogue, plus the read-only outpost troop grid. */
export type CatalogueSettingScope = CatalogueKind | 'outpost_troop'

type CatalogueSetting = 'hide_locked' | 'hide_absent' | 'collapsed'

export const catalogueSettingKey = (scope: CatalogueSettingScope, setting: CatalogueSetting): string =>
  `eoneom.catalogue.${scope}.${setting}`

/**
 * Per-viewer convenience stored in `localStorage` (slice 043): any failure (no storage, blocked access,
 * malformed value) falls back to the default.
 */
const readCatalogueSetting = <T>(
  scope: CatalogueSettingScope,
  setting: CatalogueSetting,
  fallback: T,
  isValid: (value: unknown) => value is T
): T => {
  try {
    const raw = window.localStorage.getItem(catalogueSettingKey(scope, setting))
    if (raw === null) {
      return fallback
    }
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

const writeCatalogueSetting = (
  scope: CatalogueSettingScope,
  setting: CatalogueSetting,
  value: unknown
): void => {
  try {
    window.localStorage.setItem(catalogueSettingKey(scope, setting), JSON.stringify(value))
  } catch {
    // Storage unavailable: the setting lasts for this page only.
  }
}

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

const useCatalogueSetting = <T>(
  scope: CatalogueSettingScope,
  setting: CatalogueSetting,
  fallback: T,
  isValid: (value: unknown) => value is T
): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(() => readCatalogueSetting(scope, setting, fallback, isValid))
  const update = useCallback((next: T) => {
    setValue(next)
    writeCatalogueSetting(scope, setting, next)
  }, [scope, setting])
  return [value, update]
}

/** « Masquer les verrouillés » / « Masquer les unités absentes » checkbox state. */
export const useCatalogueFlag = (
  scope: CatalogueSettingScope,
  setting: 'hide_locked' | 'hide_absent',
  fallback: boolean
) => useCatalogueSetting(scope, setting, fallback, isBoolean)

/** Ids of the collapsed groups of a catalogue. */
export const useCatalogueCollapsedGroups = (scope: CatalogueSettingScope) =>
  useCatalogueSetting<string[]>(scope, 'collapsed', [], isStringList)
