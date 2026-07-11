import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/src/api/client';
import type { SkillsState } from '@/src/api/dashboard';
import { useProgress, useSkills } from '@/src/features/dashboard/useDashboard';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

// Short parent-facing labels for the eight orthography skills (S1..S8).
const SKILL_LABELS: Record<number, string> = {
  1: 'Үсэг таних',
  2: 'Эгшгийн зохицол',
  3: 'Гийгүүлэгч',
  4: 'Сонсох бичих',
  5: 'Үг зөв бичих',
  6: 'Нөхөх / угсрах',
  7: 'Том үсэг',
  8: 'Цэг таслал',
};

function skillRows(skills: SkillsState) {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    n,
    label: SKILL_LABELS[n],
    score: (skills as unknown as Record<string, number>)[`s${n}_score`] ?? 0,
    level: (skills as unknown as Record<string, string>)[`s${n}_level`] ?? 'M0',
  }));
}

export default function DashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skillsQuery = useSkills(id);
  const progressQuery = useProgress(id);

  const notDiagnosedYet =
    skillsQuery.error instanceof ApiError && skillsQuery.error.status === 404;

  if (skillsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.progressFill} />
      </SafeAreaView>
    );
  }

  if (notDiagnosedYet) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.title}>Ахиц алга байна</Text>
        <Text style={styles.muted}>Эхлээд онош өгснөөр чадварын дүн энд харагдана.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace(`/learner/${id}/diagnostic`)}>
          <Text style={styles.primaryButtonText}>Онош эхлүүлэх</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (skillsQuery.isError || !skillsQuery.data) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.muted}>Дүнг ачаалж чадсангүй.</Text>
      </SafeAreaView>
    );
  }

  const skills = skillsQuery.data.skills;
  const rows = skillRows(skills);
  const streak = progressQuery.data?.current_streak ?? skills.current_streak ?? 0;
  const longest = progressQuery.data?.longest_streak ?? skills.longest_streak ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ахиц</Text>

        <View style={styles.levelCard}>
          <Text style={styles.levelLabel}>Ерөнхий түвшин</Text>
          <Text style={styles.levelValue}>{skills.general_level}</Text>
        </View>

        <View style={styles.streakRow}>
          <View style={styles.streakBox}>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakLabel}>Өдрийн цуваа 🔥</Text>
          </View>
          <View style={styles.streakBox}>
            <Text style={styles.streakValue}>{longest}</Text>
            <Text style={styles.streakLabel}>Хамгийн урт</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Чадварууд</Text>
        {rows.map((row) => (
          <View key={row.n} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{row.label}</Text>
            <View style={styles.skillBarTrack}>
              <View style={[styles.skillBarFill, { width: `${Math.round(row.score * 100)}%` }]} />
            </View>
            <Text style={styles.skillLevel}>{row.level}</Text>
          </View>
        ))}

        {skills.weak_skills.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Анхаарах чадвар</Text>
            <Text style={styles.muted}>
              {skills.weak_skills
                .map((s) => SKILL_LABELS[Number(s.replace(/\D/g, ''))] ?? s)
                .join(', ')}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.textNavy,
    marginTop: 12,
  },
  muted: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  levelLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  levelValue: {
    fontFamily: fonts.black,
    fontSize: 34,
    color: colors.textChoice,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 12,
  },
  streakBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    padding: 16,
    alignItems: 'center',
    gap: 2,
  },
  streakValue: {
    fontFamily: fonts.black,
    fontSize: 24,
    color: colors.textNavy,
  },
  streakLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skillLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textNavy,
    width: 110,
  },
  skillBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.progressFill,
  },
  skillLevel: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
    color: colors.progressText,
    width: 28,
    textAlign: 'right',
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
