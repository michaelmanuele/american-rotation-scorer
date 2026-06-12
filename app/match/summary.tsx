import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { loadMatchFull } from '@/db/matches';
import { playerFramePoints } from '@/domain/rules';
import { matchTotalsFromFrames } from '@/domain/events';
import type { Match } from '@/domain/types';
import { playerFullName } from '@/domain/types';

export default function Summary() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const m = await loadMatchFull(id);
      if (!cancelled) {
        setMatch(m);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Match not found</Text>
        <Pressable
          style={styles.btn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.btnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const totals = matchTotalsFromFrames(match.frames);
  const winnerName =
    match.winnerSlot === 0
      ? playerFullName(match.players[0])
      : match.winnerSlot === 1
      ? playerFullName(match.players[1])
      : null;

  const durationMs =
    match.endedAt && match.startedAt ? match.endedAt - match.startedAt : null;

  // Drop the trailing empty frame (created by frame_end events when no more
  // pockets were recorded). Only count frames that actually had pockets.
  const playedFrames = match.frames.filter((f) => f.events.length > 0);
  const ballsPocketed = playedFrames.reduce(
    (n, f) => n + f.events.length,
    0
  );
  const avgPerFrameP1 =
    playedFrames.length > 0 ? totals[0] / playedFrames.length : 0;
  const avgPerFrameP2 =
    playedFrames.length > 0 ? totals[1] / playedFrames.length : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {winnerName ? (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerLabel}>WINNER</Text>
          <Text style={styles.winnerName}>{winnerName}</Text>
        </View>
      ) : (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerLabel}>FINAL SCORE</Text>
        </View>
      )}

      <View style={styles.scoreRow}>
        <ScoreBox
          name={playerFullName(match.players[0])}
          score={totals[0]}
          isWinner={match.winnerSlot === 0}
        />
        <Text style={styles.scoreDash}>—</Text>
        <ScoreBox
          name={playerFullName(match.players[1])}
          score={totals[1]}
          isWinner={match.winnerSlot === 1}
        />
      </View>

      <View style={styles.stats}>
        <Stat label="Race to" value={String(match.raceTo)} />
        <Stat
          label="Frames played"
          value={String(playedFrames.length)}
        />
        <Stat label="Balls pocketed" value={String(ballsPocketed)} />
        {durationMs != null && (
          <Stat label="Duration" value={formatDuration(durationMs)} />
        )}
        <Stat
          label={`${match.players[0].firstName} avg/frame`}
          value={avgPerFrameP1.toFixed(1)}
        />
        <Stat
          label={`${match.players[1].firstName} avg/frame`}
          value={avgPerFrameP2.toFixed(1)}
        />
      </View>

      <Text style={styles.sectionLabel}>FRAME BREAKDOWN</Text>
      {playedFrames.map((f) => {
        const p1 = playerFramePoints(f.events, 0);
        const p2 = playerFramePoints(f.events, 1);
        return (
          <View key={f.index} style={styles.frameRow}>
            <Text style={styles.frameIdx}>FRAME {f.index + 1}</Text>
            <Text style={styles.frameBreaker}>
              {match.players[f.breakerSlot].firstName} broke
            </Text>
            <Text style={styles.frameScore}>
              {p1} – {p2}
            </Text>
          </View>
        );
      })}

      <Pressable
        style={styles.btn}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.btnText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

function ScoreBox({
  name,
  score,
  isWinner,
}: {
  name: string;
  score: number;
  isWinner: boolean;
}) {
  return (
    <View style={[styles.scoreBox, isWinner && styles.scoreBoxWinner]}>
      <Text
        style={[styles.scoreNum, isWinner && { color: colors.primary }]}
      >
        {score}
      </Text>
      <Text
        style={[styles.scoreName, isWinner && { color: colors.textPrimary }]}
        numberOfLines={2}
      >
        {name}
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  winnerCard: {
    alignItems: 'center',
    marginBottom: 18,
  },
  winnerLabel: {
    color: colors.textSecondary,
    letterSpacing: 3,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  winnerName: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  scoreBoxWinner: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  scoreNum: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: '800',
  },
  scoreName: {
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreDash: {
    color: colors.textTertiary,
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionLabel: {
    color: colors.textTertiary,
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  frameRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    alignItems: 'center',
  },
  frameIdx: {
    color: colors.textTertiary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.5,
    width: 80,
  },
  frameBreaker: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  frameScore: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 1 },
});
