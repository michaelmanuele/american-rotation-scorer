import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { colors } from '@/theme/colors';
import { useMatchStore } from '@/store/matchStore';
import { findInProgress, type MatchSummary } from '@/db/matches';
import { playerFullName } from '@/domain/types';
import { RulesModal } from '@/components/RulesModal';

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
        <MenuButton href="/match/new" label="New Match" />
        <MenuButton href="/history" label="History" />
        <MenuButton href="/roster" label="Players" />
      </View>

      <Pressable
        onPress={() => setRulesOpen(true)}
        style={({ pressed }) => [styles.rulesLink, pressed && { opacity: 0.6 }]}
        hitSlop={10}
      >
        <Text style={styles.rulesLinkText}>Rules & How to Score</Text>
      </Pressable>

      <RulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </View>
  );
}

function MenuButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
    </Link>
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
  menu: { gap: 12 },
  btn: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },
  rulesLink: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rulesLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
