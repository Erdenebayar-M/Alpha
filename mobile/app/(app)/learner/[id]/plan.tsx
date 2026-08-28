import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PressableScale from '@/src/components/PressableScale';
import { ApiError } from '@/src/api/client';
import type { PlanLesson } from '@/src/api/plan';
import { usePlan } from '@/src/features/dashboard/useDashboard';
import {
  formatDate,
  isDone,
  skillLabel,
  statusLabel,
  templateLabel,
} from '@/src/features/plan/planFormat';
import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planQuery = usePlan(id);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const noPlanYet = planQuery.error instanceof ApiError && planQuery.error.status === 404;

  if (planQuery.isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.progressFill} />
      </SafeAreaView>
    );
  }

  if (noPlanYet) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.title}>Төлөвлөгөө алга</Text>
        <Text style={styles.muted}>Эхлээд онош өгснөөр хичээлийн төлөвлөгөө энд харагдана.</Text>
        <PressableScale style={styles.primaryButton} onPress={() => router.replace(`/learner/${id}/diagnostic`)}>
          <Text style={styles.primaryButtonText}>Онош эхлүүлэх</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <Text style={styles.muted}>Төлөвлөгөөг ачаалж чадсангүй.</Text>
      </SafeAreaView>
    );
  }

  const plan = planQuery.data.plan;
  const lessons = [...plan.lessons].sort((a, b) => a.day_number - b.day_number);
  const doneCount = lessons.filter((l) => isDone(l.status)).length;
  const totalTasks = lessons.reduce((sum, l) => sum + l.total_tasks, 0);
  const doneTasks = lessons.reduce((sum, l) => sum + l.completed_tasks, 0);
  const overallPct = lessons.length > 0 ? Math.round((doneCount / lessons.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Хичээлийн төлөвлөгөө</Text>

        {/* Overview card */}
        <View style={styles.overview}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{templateLabel(plan.template)}</Text>
          </View>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCell}>
              <Text style={styles.overviewValue}>{plan.duration_days}</Text>
              <Text style={styles.overviewLabel}>өдөр</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={styles.overviewValue}>{plan.daily_minutes}</Text>
              <Text style={styles.overviewLabel}>мин / өдөр</Text>
            </View>
            <View style={styles.overviewCell}>
              <Text style={styles.overviewValue}>{overallPct}%</Text>
              <Text style={styles.overviewLabel}>биелэлт</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${overallPct}%` }]} />
          </View>
          <Text style={styles.overviewSub}>
            {doneCount}/{lessons.length} хичээл · {doneTasks}/{totalTasks} даалгавар
          </Text>

          {plan.priority_skills.length > 0 ? (
            <Text style={styles.overviewSkills}>
              Гол чадвар: {plan.priority_skills.map(skillLabel).join(', ')}
            </Text>
          ) : null}
        </View>

        {/* Per-day schedule — each row taps open to reveal the scheduled date. */}
        <Text style={styles.sectionTitle}>Өдрийн хуваарь</Text>
        {lessons.map((lesson: PlanLesson) => {
          const done = isDone(lesson.status);
          const open = openLessonId === lesson.id;
          const pct =
            lesson.total_tasks > 0
              ? Math.round((lesson.completed_tasks / lesson.total_tasks) * 100)
              : 0;
          return (
            <PressableScale
              key={lesson.id}
              style={styles.lessonRow}
              onPress={() => setOpenLessonId(open ? null : lesson.id)}
            >
              <View style={styles.lessonHead}>
                <View style={[styles.dayChip, done && styles.dayChipDone]}>
                  <Text style={[styles.dayChipText, done && styles.dayChipTextDone]}>
                    {lesson.day_number}
                  </Text>
                </View>
                <View style={styles.lessonMain}>
                  <Text style={styles.lessonSkill}>{skillLabel(lesson.primary_skill)}</Text>
                  <Text style={styles.lessonSub}>
                    {lesson.completed_tasks}/{lesson.total_tasks} даалгавар
                  </Text>
                </View>
                <Text style={[styles.lessonStatus, done && styles.lessonStatusDone]}>
                  {statusLabel(lesson.status)}
                </Text>
              </View>

              {open ? (
                <View style={styles.lessonDetail}>
                  <View style={styles.detailProgressTrack}>
                    <View style={[styles.detailProgressFill, { width: `${pct}%` }]} />
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Өдөр</Text>
                    <Text style={styles.detailValue}>{formatDate(lesson.scheduled_date) || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Чадвар</Text>
                    <Text style={styles.detailValue}>{skillLabel(lesson.primary_skill)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ахиц</Text>
                    <Text style={styles.detailValue}>{pct}%</Text>
                  </View>
                </View>
              ) : null}
            </PressableScale>
          );
        })}

        {/* Checkpoints */}
        {plan.checkpoints.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Шалгалт</Text>
            {plan.checkpoints.map((cp) => (
              <View key={cp.id} style={styles.lessonRow}>
                <View style={styles.lessonHead}>
                  <View style={[styles.dayChip, styles.checkpointChip]}>
                    <Text style={styles.checkpointChipText}>★</Text>
                  </View>
                  <View style={styles.lessonMain}>
                    <Text style={styles.lessonSkill}>Шалгах өдөр</Text>
                    <Text style={styles.lessonSub}>{formatDate(cp.scheduled_date) || '—'}</Text>
                  </View>
                  <Text style={[styles.lessonStatus, isDone(cp.status) && styles.lessonStatusDone]}>
                    {statusLabel(cp.status)}
                  </Text>
                </View>
              </View>
            ))}
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
  overview: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    padding: 18,
    gap: 12,
    alignItems: 'flex-start',
  },
  badge: {
    backgroundColor: colors.progressTrack,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.progressText,
  },
  overviewGrid: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  overviewCell: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  overviewValue: {
    fontFamily: fonts.black,
    fontSize: 24,
    color: colors.textChoice,
  },
  overviewLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.progressFill,
  },
  overviewSub: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textNavy,
  },
  overviewSkills: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  lessonRow: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lessonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.progressTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipDone: {
    backgroundColor: '#DCF7E3',
  },
  dayChipText: {
    fontFamily: fonts.black,
    fontSize: 15,
    color: colors.progressText,
  },
  dayChipTextDone: {
    color: '#1E9E4A',
  },
  checkpointChip: {
    backgroundColor: '#FFF3D6',
  },
  checkpointChipText: {
    fontFamily: fonts.black,
    fontSize: 16,
    color: '#D99B12',
  },
  lessonMain: {
    flex: 1,
    gap: 2,
  },
  lessonSkill: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    color: colors.textNavy,
  },
  lessonSub: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  lessonStatus: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textMuted,
  },
  lessonStatusDone: {
    color: '#1E9E4A',
  },
  lessonDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.sheetBorder,
    gap: 8,
  },
  detailProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.progressFill,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textNavy,
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
