import { useCallback, useEffect, useState } from 'react';
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
import { loadMatchFull, markMatchPostedToChallonge } from '@/db/matches';
import { playerFramePoints } from '@/domain/rules';
import { matchTotalsFromFrames } from '@/domain/events';
import type { Match } from '@/domain/types';
import { playerFullName } from '@/domain/types';
import { getApiKey } from '@/services/settings';
import { ChallongeError, postMatchScore } from '@/services/challonge';

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
  const isFromChallonge =
    !!match.challongeMatchId && !!match.challongeTournamentSlug;
  const isCompleted = match.status === 'completed' && match.winnerSlot != null;
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

      {isFromChallonge && isCompleted && (
        <ChallongeCard match={match} totals={totals} onPosted={setMatch} />
      )}

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

type ChallongeCardStatus =
  | { kind: 'idle' }
  | { kind: 'posting' }
  | { kind: 'error'; message: string };

function ChallongeCard({
  match,
  totals,
  onPosted,
}: {
  match: Match;
  totals: [number, number];
  onPosted: (m: Match) => void;
}) {
  const [status, setStatus] = useState<ChallongeCardStatus>({ kind: 'idle' });

  const p1ChallongeId = match.players[0].challongeParticipantId;
  const p2ChallongeId = match.players[1].challongeParticipantId;
  const winnerChallongeId =
    match.winnerSlot === 0 ? p1ChallongeId : p2ChallongeId;

  const bothLinked = p1ChallongeId != null && p2ChallongeId != null;
  const alreadyPosted = match.postedToChallongeAt != null;

  const post = useCallback(async () => {
    if (!match.challongeMatchId || !match.challongeTournamentSlug) return;
    if (winnerChallongeId == null) {
      setStatus({
        kind: 'error',
        message:
          'Cannot post: winner is not linked to a Challonge participant. Open Tournaments → Sync Roster and make sure both players are linked.',
      });
      return;
    }
    setStatus({ kind: 'posting' });
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setStatus({
          kind: 'error',
          message: 'No Challonge API key found. Add one in Settings.',
        });
        return;
      }
      await postMatchScore(
        apiKey,
        match.challongeTournamentSlug,
        match.challongeMatchId,
        {
          p1Score: totals[0],
          p2Score: totals[1],
          winnerParticipantId: winnerChallongeId,
        }
      );
      const now = Date.now();
      await markMatchPostedToChallonge(match.id, now);
      onPosted({ ...match, postedToChallongeAt: now });
    } catch (e) {
      let message = 'Failed to post. Try again in a moment.';
      if (e instanceof ChallongeError) {
        if (e.isAuth) message = 'Challonge API key was rejected (401). Update it in Settings.';
        else if (e.isNotFound) message = 'Match not found on Challonge (404). It may have been reset.';
        else if (e.isUnprocessable) message = 'Challonge refused this update (422). The match may not be open yet, or the winner id may not match either player.';
        else if (e.isRateLimit) message = 'Rate-limited by Challonge (429). Wait a few seconds and retry.';
        else message = `Challonge error ${e.status}. Try again.`;
      }
      setStatus({ kind: 'error', message });
    }
  }, [match, totals, winnerChallongeId, onPosted]);

  if (alreadyPosted) {
    const when = new Date(match.postedToChallongeAt!).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return (
      <View style={styles.challongeCard}>
        <Text style={styles.challongeLabel}>CHALLONGE</Text>
        <Text style={styles.challongePosted}>✓  Posted to bracket at {when}</Text>
      </View>
    );
  }

  return (
    <View style={styles.challongeCard}>
      <Text style={styles.challongeLabel}>CHALLONGE</Text>
      {!bothLinked && (
        <Text style={styles.challongeWarn}>
          One or both players aren’t linked to Challonge yet. Open Tournaments → Sync Roster to link them, then come back.
        </Text>
      )}
      <Pressable
        style={[
          styles.challongeBtn,
          (status.kind === 'posting' || !bothLinked) && styles.challongeBtnDisabled,
        ]}
        disabled={status.kind === 'posting' || !bothLinked}
        onPress={post}
      >
        {status.kind === 'posting' ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={styles.challongeBtnText}>POST TO CHALLONGE</Text>
        )}
      </Pressable>
      {status.kind === 'error' && (
        <Text style={styles.challongeError}>{status.message}</Text>
      )}
    </View>
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
  challongeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#00E5FF33',
  },
  challongeLabel: {
    color: '#00E5FF',
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  challongeWarn: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  challongeBtn: {
    backgroundColor: '#00E5FF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  challongeBtnDisabled: {
    opacity: 0.35,
  },
  challongeBtnText: {
    color: '#001A22',
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 14,
  },
  challongeError: {
    color: '#FF8888',
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  challongePosted: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
