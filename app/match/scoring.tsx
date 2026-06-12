import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import { PlayerCard } from '@/components/PlayerCard';
import { BallGrid } from '@/components/BallGrid';
import { colors } from '@/theme/colors';

export default function Scoring() {
  const current = useMatchStore((s) => s.current);
  const activeSlot = useMatchStore((s) => s.activeSlot);
  const setActiveSlot = useMatchStore((s) => s.setActiveSlot);
  const pocketBall = useMatchStore((s) => s.pocketBall);
  const unpocketBall = useMatchStore((s) => s.unpocketBall);
  const undoLast = useMatchStore((s) => s.undoLast);
  const nextFrame = useMatchStore((s) => s.nextFrame);
  const matchTotals = useMatchStore((s) => s.matchTotals());
  const frameTotals = useMatchStore((s) => s.frameTotals());
  const pocketedBy = useMatchStore((s) => s.pocketedBy());
  const frameComplete = useMatchStore((s) => s.isCurrentFrameComplete());
  const winnerSlot = useMatchStore((s) => s.winnerSlot());
  const endMatch = useMatchStore((s) => s.endMatch);

  const [askedFinish, setAskedFinish] = useState(false);

  useEffect(() => {
    if (winnerSlot !== null && !askedFinish && current) {
      setAskedFinish(true);
      const name = current.players[winnerSlot].firstName;
      Alert.alert(
        `${name} reached ${current.raceTo}`,
        'End the match or keep shooting?',
        [
          { text: 'Continue Shooting', style: 'cancel' },
          {
            text: 'End Match',
            style: 'destructive',
            onPress: () => {
              endMatch();
              router.replace('/match/summary');
            },
          },
        ]
      );
    }
  }, [winnerSlot, askedFinish, current, endMatch]);

  if (!current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No match in progress</Text>
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.replace('/match/new')}
        >
          <Text style={styles.linkBtnText}>Start a Match</Text>
        </Pressable>
      </View>
    );
  }

  const onTapBall = (ball: number) => {
    if (pocketedBy[ball] !== undefined) {
      unpocketBall(ball);
    } else {
      pocketBall(ball);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header strip */}
      <View style={styles.headerRow}>
        <Pressable onPress={undoLast} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerCenter}>RACE TO {current.raceTo}</Text>
        <Pressable
          onPress={nextFrame}
          disabled={!frameComplete}
          style={[
            styles.headerBtn,
            styles.headerBtnRight,
            !frameComplete && { opacity: 0.4 },
          ]}
        >
          <Text style={styles.headerBtnText}>Next Frame →</Text>
        </Pressable>
      </View>

      <Text style={styles.frameLabel}>
        FRAME {current.frames.length}
      </Text>

      <PlayerCard
        player={current.players[0]}
        slot={0}
        active={activeSlot === 0}
        matchScore={matchTotals[0]}
        frameScore={frameTotals[0]}
        onPress={() => setActiveSlot(0)}
      />
      <PlayerCard
        player={current.players[1]}
        slot={1}
        active={activeSlot === 1}
        matchScore={matchTotals[1]}
        frameScore={frameTotals[1]}
        onPress={() => setActiveSlot(1)}
      />

      <BallGrid pocketedBy={pocketedBy} onTapBall={onTapBall} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  headerBtnRight: { backgroundColor: colors.success },
  headerBtnText: { color: colors.textPrimary, fontWeight: '700' },
  headerCenter: {
    color: colors.textSecondary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  frameLabel: {
    color: colors.textTertiary,
    letterSpacing: 2,
    marginVertical: 6,
    fontWeight: '700',
    fontSize: 12,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.textSecondary, marginBottom: 16 },
  linkBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  linkBtnText: { color: colors.textPrimary, fontWeight: '700' },
});
