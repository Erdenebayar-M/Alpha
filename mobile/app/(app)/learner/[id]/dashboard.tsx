import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DiagnosisRequiredScreen from '@/src/components/DiagnosisRequiredScreen';
import LoadFailedScreen from '@/src/components/LoadFailedScreen';
import LoadingScreen from '@/src/components/LoadingScreen';
import PressableScale from '@/src/components/PressableScale';
import ProgressBar from '@/src/components/ProgressBar';
import { screenChrome } from '@/src/components/screenChrome';
import { ApiError } from '@/src/api/client';
import type { SkillsState } from '@/src/api/dashboard';
import { usePlan, useProgress, useSkills } from '@/src/features/dashboard/useDashboard';
import { isDone, SKILL_LABELS, skillLabel, templateLabel } from '@/src/features/plan/planFormat';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

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
  const planQuery = usePlan(id);

  const notDiagnosedYet =
    skillsQuery.error instanceof ApiError && skillsQuery.error.status === 404;

  if (skillsQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (notDiagnosedYet) {
    return (
      <DiagnosisRequiredScreen
        learnerId={id}
        title="Ахиц алга байна"
        message="Эхлээд онош өгснөөр чадварын дүн энд харагдана."
      />
    );
  }

  if (skillsQuery.isError || !skillsQuery.data) {
    return <LoadFailedScreen message="Дүнг ачаалж чадсангүй." />;
  }

  const skills = skillsQuery.data.skills;
  const rows = skillRows(skills);
  // progress has its own endpoint but skills already carries the same two
  // fields, so a failed progressQuery still shows a real number rather than
  // a bare 0 — streakUnavailable only fires when *neither* source has it.
  const streak = progressQuery.data?.current_streak ?? skills.current_streak;
  const longest = progressQuery.data?.longest_streak ?? skills.longest_streak;
  const streakUnavailable = progressQuery.isError && streak === undefined;

  const plan = planQuery.data?.plan;
  const planDone = plan ? plan.lessons.filter((l) => isDone(l.status)).length : 0;
  const planFailed =
    planQuery.isError && !(planQuery.error instanceof ApiError && planQuery.error.status === 404);

  return (
    <SafeAreaView style={screenChrome.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={screenChrome.content}>
        <Text style={screenChrome.title}>Ахиц</Text>

        <View style={styles.levelCard}>
          <Text style={styles.levelLabel}>Ерөнхий түвшин</Text>
          <Text style={styles.levelValue}>{skills.general_level}</Text>
        </View>

        <View style={styles.streakRow}>
          {[
            { value: streak, label: 'Өдрийн цуваа 🔥' },
            { value: longest, label: 'Хамгийн урт' },
          ].map((box, i) => (
            <View key={i} style={styles.streakBox}>
              <Text style={styles.streakValue}>{streakUnavailable ? '—' : (box.value ?? 0)}</Text>
              <Text style={styles.streakLabel}>{box.label}</Text>
            </View>
          ))}
        </View>
        {streakUnavailable && <Text style={styles.inlineError}>Цуваа ачаалж чадсангүй.</Text>}

        {/* Tappable summary → the full detailed plan screen. */}
        {plan ? (
          <PressableScale style={styles.planCard} onPress={() => router.push(`/learner/${id}/plan`)}>
            <View style={styles.planCardMain}>
              <Text style={styles.planCardTitle}>Хичээлийн төлөвлөгөө</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{templateLabel(plan.template)}</Text>
              </View>
              <Text style={styles.planCardSub}>
                {planDone}/{plan.lessons.length} хичээл дууссан · дэлгэрэнгүйг харах
              </Text>
            </View>
            <Text style={styles.planChevron}>›</Text>
          </PressableScale>
        ) : planFailed ? (
          <PressableScale style={styles.planErrorCard} onPress={() => planQuery.refetch()}>
            <Text style={styles.planCardSub}>Төлөвлөгөө ачаалж чадсангүй. Дахин оролдох</Text>
          </PressableScale>
        ) : null}

        <Text style={styles.sectionTitle}>Чадварууд</Text>
        {rows.map((row) => (
          <View key={row.n} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{row.label}</Text>
            <ProgressBar percent={Math.round(row.score * 100)} height={12} style={styles.skillBarTrack} />
            <Text style={styles.skillLevel}>{row.level}</Text>
          </View>
        ))}

        {skills.weak_skills.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Анхаарах чадвар</Text>
            <Text style={screenChrome.muted}>{skills.weak_skills.map(skillLabel).join(', ')}</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.textNavy,
    marginTop: 12,
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
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    padding: 16,
    gap: 12,
  },
  planCardMain: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  planCardTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.textNavy,
  },
  planBadge: {
    backgroundColor: colors.progressTrack,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  planBadgeText: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.progressText,
  },
  planCardSub: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  planChevron: {
    fontFamily: fonts.black,
    fontSize: 30,
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
  },
  skillLevel: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
    color: colors.progressText,
    width: 28,
    textAlign: 'right',
  },
  inlineError: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -4,
  },
  planErrorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    padding: 16,
    alignItems: 'center',
  },
});
