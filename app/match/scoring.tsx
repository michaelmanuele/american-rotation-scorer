import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import { PlayerCard } from '@/components/PlayerCard';
import { BallGrid } from '@/components/BallGrid';
import { colors } from '@/theme/colors';
import { breakerForFrame, playerFullName } from '@/domain/types';

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
  const currentBreakerSlot = useMatchStore((s) => s.currentBreakerSlot());

  const [askedFinish, setAskedFinish] = useState(false);

  // Auto-detect race-to completion
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

  // Stable layout: top slot is whoever broke FIRST (won the coin toss / was confirmed).
  // Only the BREAKING pill moves between cards as the breaker alternates each frame.
  const topSlot: 0 | 1 = current.initialBreakerSlot;
  const bottomSlot: 0 | 1 = topSlot === 0 ? 1 : 0;

  // Confirm-next-frame breaker prompt
  const onNextFrame = () => {
    if (!frameComplete) return;
    const nextIndex = current.frames.length; // 0-based, so this is the upcoming frame index
    const nextBreaker = breakerForFrame(current.initialBreakerSlot, nextIndex);
    const nextBreakerName = playerFullName(current.players[nextBreaker]);
    Alert.alert(
      'Next Frame',
      `${nextBreakerName} breaks the next frame.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Frame',
          style: 'default',
          isPreferred: true,
          onPress: () => nextFrame(),
        },
      ]
    );
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
          onPress={onNextFrame}
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

      <Text style={styles.frameLabel}>FRAME {current.frames.length}</Text>

      <PlayerCard
        player={current.players[topSlot]}
        slot={topSlot}
        active={activeSlot === topSlot}
        matchScore={matchTotals[topSlot]}
        frameScore={frameTotals[topSlot]}
        isBreaker={currentBreakerSlot === topSlot}
        onPress={() => setActiveSlot(topSlot)}
      />
      <PlayerCard
        player={current.players[bottomSlot]}
        slot={bottomSlot}
        active={activeSlot === bottomSlot}
        matchScore={matchTotals[bottomSlot]}
        frameScore={frameTotals[bottomSlot]}
        isBreaker={currentBreakerSlot === bottomSlot}
        onPress={() => setActiveSlot(bottomSlot)}
      />

      <View style={{ marginTop: 14 }}>
        <BallGrid pocketedBy={pocketedBy} onTapBall={onTapBall} />
      </View>
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
