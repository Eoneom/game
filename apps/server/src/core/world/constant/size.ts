export const WORLD_SIZE = 100
/** Empire snapshot / system AI viewport radius (11×11). Unrelated to the web map zoom (slice 044 `MAP_ZOOM_ROWS`). */
export const INITIAL_VIEWPORT_HALF_EXTENT = 5
/** Max side of a `GET /world/cells` request; the web map no longer pages terrain through it (slice 044). */
export const MAX_VIEWPORT_SIDE = 20
/** Max side of a `GET /world/markers` request: the minimap asks for the whole world (slice 044). */
export const MAX_MARKER_VIEWPORT_SIDE = 100
