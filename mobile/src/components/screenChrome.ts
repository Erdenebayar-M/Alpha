import { StyleSheet } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

/**
 * Style rules shared by the learner detail screens (dashboard, plan, diagnostic) for
 * their common chrome: the plain `screen`/`centered` wrappers every loading/empty/
 * error state uses, and the big blue CTA button pattern. `title`/`muted`/`content`
 * are dashboard+plan's own shared rules (diagnostic's equivalent text uses different
 * values — a bigger/differently-coloured `message` — so it keeps its own).
 */
export const screenChrome = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontFamily: fonts.black,
    fontSize: 26,
    color: colors.textNavy,
  },
  muted: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  primaryButton: {
    minWidth: 200,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.white,
  },
});
