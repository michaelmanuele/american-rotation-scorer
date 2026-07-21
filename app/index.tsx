import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { colors } from '@/theme/colors';
import { useMatchStore } from '@/store/matchStore';
import { findInProgress, type MatchSummary } from '@/db/matches';
import { playerFullName } from '@/domain/types';
import { RulesModal } from '@/components/RulesModal';
import { CHALLONGE_ENABLED } from '@/config/features';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString();

export default function Home() {
  const [resume, setResume] = useState<MatchSummary | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const abandonMatch = useMatchStore((s) => s.abandonMatch);
  const resumeMatch = useMatchStore((s) => s.resumeMatch);
  const currentInStore = useMatchStore((s) => s.current);

  const refreshResume = useCallback(async () => {
    const m = await findInProgress();
    setResume(m);
  }, []);

  // Re-check every time the home screen comes into focus so the banner
  // appears/disappears as matches start/end/abandon.
  useFocusEffect(
    useCallback(() => {
      refreshResume();
    }, [refreshResume])
  );

  const onResume = async () => {
    if (!resume) return;
    // If the store already has this match loaded (boot hydration), just navigate.
    if (!currentInStore || currentInStore.id !== resume.id) {
      await resumeMatch(resume.id);
    }
    router.push('/match/scoring');
  };

  const onDiscard = () => {
    if (!resume) return;
    Alert.alert(
      'Discard match in progress?',
      `This will abandon ${playerFullName(resume.player1)} vs ${playerFullName(
        resume.player2
      )}. The match will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            // If this match isn't loaded in the store (e.g. user backgrounded
            // app), load it first so abandonMatch logs the abandon event.
            if (!currentInStore || currentInStore.id !== resume.id) {
              await resumeMatch(resume.id);
            }
            await abandonMatch();
            await refreshResume();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={12}
        style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}
        accessibilityLabel="Settings"
      >
        <Text style={styles.gearIcon}>⚙︎</Text>
      </Pressable>

      <Text style={styles.brand}>AMERICAN ROTATION</Text>
      <Text style={styles.tag}>Scorer</Text>

      {resume && (
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Match in progress</Text>
            <Text style={styles.bannerSub}>
              {playerFullName(resume.player1)} {resume.p1Score} —{' '}
              {resume.p2Score} {playerFullName(resume.player2)}
            </Text>
            <Text style={styles.bannerMeta}>
              Frame {resume.framesPlayed} · Race to {resume.raceTo}
            </Text>
          </View>
          <View style={styles.bannerBtns}>
            <Pressable
              onPress={onResume}
              style={({ pressed }) => [
                styles.resumeBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.resumeBtnText}>Resume</Text>
            </Pressable>
            <Pressable
              onPress={onDiscard}
              style={({ pressed }) => [
                styles.discardBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.discardBtnText}>Discard</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.menu}>
        <MenuButton href="/match/new" label="New Match" primary />
        <MenuButton href="/history" label="History" />
        <MenuButton href="/roster" label="Players" />
        {CHALLONGE_ENABLED && (
          <MenuButton href="/tournaments" label="League" />
        )}
      </View>

      <View style={styles.rulesRow}>
        <Pressable
          onPress={() => setRulesOpen(true)}
          style={({ pressed }) => [styles.rulesPill, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Text style={styles.rulesPillText}>Rules & How to Score</Text>
        </Pressable>
      </View>

      <RulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Text style={styles.version}>
        v{APP_VERSION}
        {BUILD_NUMBER ? ` (${BUILD_NUMBER})` : ''}
      </Text>
    </View>
  );
}

function MenuButton({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={() => router.push(href as any)}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  tag: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  banner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
  },
  bannerSub: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  bannerMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  bannerBtns: { gap: 8, alignItems: 'stretch' },
  resumeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  discardBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  discardBtnText: {
    color: colors.textTertiary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },
  menu: {
    gap: 14,
    alignSelf: 'stretch',
    maxWidth: 480,
    width: '100%',
    marginHorizontal: 'auto',
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnPrimary: {
    backgroundColor: 'rgba(233,30,99,0.16)',
    borderColor: 'rgba(233,30,99,0.55)',
  },
  btnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  btnTextPrimary: {
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  rulesRow: {
    alignItems: 'center',
    marginTop: 28,
  },
  rulesPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  rulesPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  version: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    color: colors.textTertiary,
    fontSize: 11,
    letterSpacing: 1,
    opacity: 0.6,
  },
  gear: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    color: colors.textSecondary,
    fontSize: 26,
  },
});
