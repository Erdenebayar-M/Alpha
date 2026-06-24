import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[Brand.landingTop, Brand.landingBottom]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* Hero area — logo + scattered mascots */}
        <View style={styles.hero}>
          {/* ОРТО logo top-right */}
          <Image
            source={require('@/assets/images/orto/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="ОРТО"
          />

          {/* Mascots scattered to match Figma layout */}
          <Image
            source={require('@/assets/images/orto/mascot-green.png')}
            style={[styles.mascot, styles.mascotGreen]}
            contentFit="contain"
            accessibilityLabel=""
          />
          <Image
            source={require('@/assets/images/orto/mascot-pink.png')}
            style={[styles.mascot, styles.mascotPink]}
            contentFit="contain"
            accessibilityLabel=""
          />
          <Image
            source={require('@/assets/images/orto/mascot-blue.png')}
            style={[styles.mascot, styles.mascotBlue]}
            contentFit="contain"
            accessibilityLabel=""
          />
          <Image
            source={require('@/assets/images/orto/mascot-yellow.png')}
            style={[styles.mascot, styles.mascotYellow]}
            contentFit="contain"
            accessibilityLabel=""
          />
        </View>

        {/* Bottom white card */}
        <View style={styles.card}>
          <Text style={styles.title}>Зөв бичих аяллаа хаанаас эхлэх вэ?</Text>
          <Text style={styles.subtitle}>3 хөгжилтэй даалгавараар эхлэе!</Text>

          <PrimaryButton
            label="Аяллаа эхлэх"
            style={styles.cta}
            onPress={() => router.push('/diagnostic')}
          />

          <View style={styles.pill}>
            <View style={styles.clockIcon} />
            <Text style={styles.pillText}>Ойролцоогоор 1-2 минут</Text>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Hero
  hero: {
    flex: 1,
    position: 'relative',
  },
  logo: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.four,
    width: 130,
    height: 64,
  },
  mascot: {
    position: 'absolute',
    // Default size; overridden per mascot below.
    width: 120,
    height: 120,
  },
  // Positions mirroring the Figma scattered layout.
  mascotGreen: {
    width: 140,
    height: 140,
    left: -16,
    top: '22%',
  },
  mascotPink: {
    width: 80,
    height: 80,
    left: '30%',
    top: '5%',
  },
  mascotBlue: {
    width: 130,
    height: 130,
    left: '20%',
    top: '48%',
  },
  mascotYellow: {
    width: 140,
    height: 140,
    right: -8,
    top: '35%',
  },

  // Bottom card
  card: {
    backgroundColor: Brand.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    alignItems: 'center',
  },
  title: {
    color: Brand.navy,
    fontFamily: Typography.family,
    fontSize: Typography.title.fontSize,
    lineHeight: Typography.title.lineHeight,
    fontWeight: Typography.title.fontWeight,
    textAlign: 'center',
  },
  subtitle: {
    color: Brand.textMuted,
    fontFamily: Typography.family,
    fontSize: Typography.subtitle.fontSize,
    lineHeight: Typography.subtitle.lineHeight,
    fontWeight: Typography.subtitle.fontWeight,
    textAlign: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Brand.pill,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  clockIcon: {
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Brand.textMuted,
  },
  pillText: {
    color: Brand.textMuted,
    fontFamily: Typography.family,
    fontSize: Typography.pill.fontSize,
    lineHeight: Typography.pill.lineHeight,
    fontWeight: Typography.pill.fontWeight,
  },
});
