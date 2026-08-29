// A 4px-rooted scale matching the values already in use across the app
// (see the padding/gap literals in src/features/exercise/renderers/*). Not a
// normalization — these are the sizes the Figma-derived screens already use;
// this just gives them names so new code stops inventing raw numbers
// (AGENTS.md §10/§13). Existing files aren't retrofitted in this pass: doing
// that safely requires visual verification against each screen's Figma
// reference (AGENTS.md §12), which this change doesn't attempt.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
