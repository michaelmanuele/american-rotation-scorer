import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { colors } from '@/theme/colors';
import {
  ChallongeError,
  getTournament,
  type ChallongeMatch,
  type ChallongeParticipant,
  type ChallongeTournament,
} from '@/services/challonge';
import { loadChallongeSettings } from '@/services/settings';
import {
  createPlayer,
  findPlayerByChallongeId,
  linkPlayerToChallonge,
  listPlayers,
} from '@/db/players';
import { playerFullName, type Player } from '@/domain/types';
import { useRosterStore } from '@/store/rosterStore';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'no-config' }
  | { kind: 'ok'; tournament: ChallongeTournament; myId: number | null }
  | { kind: 'error'; message: string };

type SyncResult = {
  linked: number; // existing local players that got Challonge ID attached
  created: number; // new local players inserted
  already: number; // already-linked (no-op)
};

export default function Tournaments() {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const refreshRoster = useRosterStore((s) => s.refresh);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setLastSync(null);
    const s = await loadChallongeSettings();
    if (!s.apiKey || !s.slug) {
      setState({ kind: 'no-config' });
      return;
    }
    try {
      const tournament = await getTournament(s.apiKey, s.slug);
      setState({ kind: 'ok', tournament, myId: s.myParticipantId });
    } catch (err) {
      const message =
        err instanceof ChallongeError
          ? err.isAuth
            ? 'API key was rejected (401). Check Settings.'
            : err.isNotFound
            ? 'Tournament not found (404). Check the slug in Settings.'
            : err.message
          : err instanceof Error
          ? err.message
          : 'Unknown error';
      setState({ kind: 'error', message });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onSync = async () => {
    if (state.kind !== 'ok') return;
    setSyncing(true);
    setLastSync(null);
    try {
      const result = await syncRoster(state.tournament.participants);
      setLastSync(result);
      await refreshRoster();
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state.kind === 'no-config') {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Not connected</Text>
        <Text style={styles.emptyBody}>
          Add your Challonge API key and tournament slug in Settings to see the
          roster and upcoming matches.
        </Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&rsquo;t load tournament</Text>
        <Text style={styles.emptyBody}>{state.message}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Pressable
            onPress={load}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.secondaryBtnText}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { tournament, myId } = state;
  const stateLabel = tournament.state.toUpperCase();
  const openCount = tournament.matches.filter((m) => m.state === 'open').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <Text style={styles.title}>{tournament.name}</Text>
      <Text style={styles.subtitle}>
        {stateLabel} · {tournament.participants.length} players ·{' '}
        {openCount} open match{openCount === 1 ? '' : 'es'}
      </Text>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onSync}
          disabled={syncing}
          style={({ pressed }) => [
            styles.primaryBtn,
            { flex: 1 },
            pressed && { opacity: 0.85 },
            syncing && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {syncing ? 'Syncing…' : 'Sync Roster'}
          </Text>
        </Pressable>
        <Pressable
          onPress={load}
          disabled={syncing}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.85 },
            syncing && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.secondaryBtnText}>Refresh</Text>
        </Pressable>
      </View>

      {lastSync && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            Synced — linked {lastSync.linked}, added {lastSync.created}
            {lastSync.already > 0 ? `, already linked ${lastSync.already}` : ''}
          </Text>
        </View>
      )}

      <UpcomingMatches
        tournament={tournament}
        myId={myId}
      />

      <Text style={styles.sectionLabel}>PARTICIPANTS</Text>
      <View>
        {tournament.participants.map((p) => {
          const isMe = myId !== null && p.id === myId;
          return (
            <View
              key={p.id}
              style={[styles.row, isMe && styles.rowMe]}
            >
              <View style={styles.seedBadge}>
                <Text style={styles.seedBadgeText}>#{p.seed}</Text>
              </View>
              <Text style={[styles.rowName, isMe && styles.rowNameMe]}>
                {p.name}
              </Text>
              {isMe && <Text style={styles.meTag}>YOU</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/**
 * Upcoming Matches = all Challonge matches in state 'open' (both players
 * decided, ready to play). Tap to launch the New Match flow with both
 * players pre-filled and the Challonge match id stashed for later result post.
 */
function UpcomingMatches({
  tournament,
  myId,
}: {
  tournament: ChallongeTournament;
  myId: number | null;
}) {
  const allOpen = tournament.matches.filter((m) => m.state === 'open');
  const nameById = new Map<number, string>(
    tournament.participants.map((p) => [p.id, p.name])
  );

  // "This is me" not set yet — nudge user to Settings instead of showing
  // a wall of unrelated matches.
  if (myId === null) {
    return (
      <>
        <Text style={styles.sectionLabel}>YOUR UPCOMING MATCHES</Text>
        <View style={styles.emptyMatches}>
          <Text style={styles.emptyMatchesText}>
            Set “this is me” in Settings to see your matches here.
          </Text>
        </View>
      </>
    );
  }

  const mine = allOpen.filter(
    (m) => m.player1_id === myId || m.player2_id === myId
  );

  if (mine.length === 0) {
    return (
      <>
        <Text style={styles.sectionLabel}>YOUR UPCOMING MATCHES</Text>
        <View style={styles.emptyMatches}>
          <Text style={styles.emptyMatchesText}>
            {allOpen.length === 0
              ? 'No open matches in this tournament right now.'
              : 'You\u2019re not in any open match right now. Check back after the next round is generated.'}
          </Text>
        </View>
      </>
    );
  }

  // Sort by round, then identifier.
  const sorted = [...mine].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.identifier ?? '').localeCompare(b.identifier ?? '');
  });

  return (
    <>
      <Text style={styles.sectionLabel}>YOUR UPCOMING MATCHES</Text>
      {sorted.map((m) => (
        <UpcomingMatchRow
          key={m.id}
          match={m}
          tournamentSlug={tournament.url}
          p1Name={m.player1_id !== null ? nameById.get(m.player1_id) ?? '?' : '?'}
          p2Name={m.player2_id !== null ? nameById.get(m.player2_id) ?? '?' : '?'}
          myId={myId}
        />
      ))}
    </>
  );
}

function UpcomingMatchRow({
  match,
  tournamentSlug,
  p1Name,
  p2Name,
  myId,
}: {
  match: ChallongeMatch;
  tournamentSlug: string;
  p1Name: string;
  p2Name: string;
  myId: number | null;
}) {
  const meSlot: 0 | 1 | null =
    myId !== null && match.player1_id === myId
      ? 0
      : myId !== null && match.player2_id === myId
      ? 1
      : null;
  const isMine = meSlot !== null;

  const onPress = () => {
    if (match.player1_id === null || match.player2_id === null) return;
    router.push({
      pathname: '/match/new',
      params: {
        challongeMatchId: String(match.id),
        challongeSlug: tournamentSlug,
        p1ChallongeId: String(match.player1_id),
        p2ChallongeId: String(match.player2_id),
        p1Name,
        p2Name,
      },
    });
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.matchRow,
        isMine && styles.matchRowMine,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.roundBadge}>
        <Text style={styles.roundBadgeText}>R{match.round}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.matchPlayer,
            meSlot === 0 && styles.matchPlayerMe,
          ]}
          numberOfLines={1}
        >
          {p1Name}
        </Text>
        <Text style={styles.matchVs}>vs</Text>
        <Text
          style={[
            styles.matchPlayer,
            meSlot === 1 && styles.matchPlayerMe,
          ]}
          numberOfLines={1}
        >
          {p2Name}
        </Text>
      </View>
      <Text style={styles.matchChev}>›</Text>
    </Pressable>
  );
}

/**
 * Merge Challonge participants into the local players table.
 *
 * For each participant:
 *  - If a local player already has its `challonge_participant_id`, skip (already).
 *  - Else, try to find a local player by case-insensitive full-name match.
 *      - If found, attach the Challonge id (linked).
 *      - Else, create a new local player and attach the id (created).
 */
async function syncRoster(
  participants: ChallongeParticipant[]
): Promise<SyncResult> {
  // Snapshot the local roster once so we don't requery on every iteration.
  const locals = await listPlayers();

  // Build a name -> Player index that ignores already-linked players when
  // looking up by name (so two unlinked locals with the same name don't both
  // get attached to the same participant).
  const usedLocalIds = new Set<string>();
  const byName = new Map<string, Player[]>();
  for (const p of locals) {
    const key = playerFullName(p).trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(p);
  }

  let linked = 0;
  let created = 0;
  let already = 0;

  for (const cp of participants) {
    // Already linked?
    const existing = await findPlayerByChallongeId(cp.id);
    if (existing) {
      already++;
      usedLocalIds.add(existing.id);
      continue;
    }

    // Name match?
    const nameKey = cp.name.trim().toLowerCase();
    const candidates = (byName.get(nameKey) ?? []).filter(
      (p) =>
        !usedLocalIds.has(p.id) && p.challongeParticipantId === undefined
    );
    if (candidates.length > 0) {
      const match = candidates[0];
      await linkPlayerToChallonge(match.id, cp.id);
      usedLocalIds.add(match.id);
      linked++;
      continue;
    }

    // Create new local player. Split name into first/last on the first space.
    const { firstName, lastName } = splitName(cp.name);
    const newPlayer = await createPlayer({ firstName, lastName });
    await linkPlayerToChallonge(newPlayer.id, cp.id);
    usedLocalIds.add(newPlayer.id);
    created++;
  }

  return { linked, created, already };
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  const sp = trimmed.indexOf(' ');
  if (sp === -1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.slice(0, sp),
    lastName: trimmed.slice(sp + 1).trim(),
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: 'rgba(233,30,99,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.55)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  syncBanner: {
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.45)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  syncBannerText: {
    color: colors.p2,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    gap: 12,
  },
  rowMe: {
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.55)',
    backgroundColor: 'rgba(233,30,99,0.10)',
  },
  seedBadge: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedBadgeText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  rowName: { color: colors.textPrimary, fontSize: 16, flex: 1 },
  rowNameMe: { fontWeight: '800' },
  meTag: {
    color: colors.p1,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 11,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMatches: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  emptyMatchesText: {
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    gap: 12,
  },
  matchRowMine: {
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.55)',
    backgroundColor: 'rgba(233,30,99,0.10)',
  },
  roundBadge: {
    minWidth: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBadgeText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  matchPlayer: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  matchPlayerMe: {
    color: colors.p1,
  },
  matchVs: {
    color: colors.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    marginVertical: 2,
  },
  matchChev: {
    color: colors.textTertiary,
    fontSize: 26,
    paddingHorizontal: 6,
  },
});
