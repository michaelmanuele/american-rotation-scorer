import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMatchStore } from '@/store/matchStore';
import { colors } from '@/theme/colors';
import { playerFullName, playerInitials, type Player } from '@/domain/types';
import { PlayerPicker } from '@/components/PlayerPicker';
import { findPlayerByChallongeId } from '@/db/players';

/**
 * New-match setup using the roster-backed PlayerPicker.
 *
 * Flow:
 * 1. Tap a slot → PlayerPicker opens (search/add inline).
 * 2. Both slots filled + race target set → Start enabled.
 * 3. Virtual coin toss + confirm-or-pass dialog → match starts.
 */
export default function NewMatch() {
  const startMatch = useMatchStore((s) => s.startMatch);

  // Optional Challonge prefill params (from Tournaments → tap a match).
  const params = useLocalSearchParams<{
    challongeMatchId?: string;
    challongeSlug?: string;
    p1ChallongeId?: string;
    p2ChallongeId?: string;
    p1Name?: string;
    p2Name?: string;
  }>();

  const [p1, setP1] = useState<Player | null>(null);
  const [p2, setP2] = useState<Player | null>(null);
  const [raceTo, setRaceTo] = useState('100');
  const [prefillError, setPrefillError] = useState<string | null>(null);

  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null);

  // Resolve Challonge participant ids → local Player rows on mount.
  useEffect(() => {
    const p1Id = params.p1ChallongeId
      ? Number.parseInt(params.p1ChallongeId, 10)
      : null;
    const p2Id = params.p2ChallongeId
      ? Number.parseInt(params.p2ChallongeId, 10)
      : null;
    if (!p1Id && !p2Id) return;

    (async () => {
      const missing: string[] = [];
      if (p1Id) {
        const found = await findPlayerByChallongeId(p1Id);
        if (found) setP1(found);
        else if (params.p1Name) missing.push(params.p1Name);
      }
      if (p2Id) {
        const found = await findPlayerByChallongeId(p2Id);
        if (found) setP2(found);
        else if (params.p2Name) missing.push(params.p2Name);
      }
      if (missing.length > 0) {
        setPrefillError(
          `Not in your local Players yet: ${missing.join(
            ', '
          )}. Go to Tournaments → Sync Roster, then try again.`
        );
      }
    })();
  }, [params.p1ChallongeId, params.p2ChallongeId, params.p1Name, params.p2Name]);

  const canStart = !!p1 && !!p2 && Number.parseInt(raceTo, 10) > 0;
  const challongeMatchId = params.challongeMatchId
    ? Number.parseInt(params.challongeMatchId, 10)
    : undefined;
  const challongeSlug = params.challongeSlug || undefined;

  const onStart = () => {
    if (!p1 || !p2) return;
    const players: [Player, Player] = [p1, p2];
    const target = Number.parseInt(raceTo, 10);
    const tossWinner: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    const tossLoser: 0 | 1 = tossWinner === 0 ? 1 : 0;
    const winnerName = playerFullName(players[tossWinner]);
    const loserName = playerFullName(players[tossLoser]);

    Alert.alert(
      'Coin Toss',
      `${winnerName} won the toss and breaks first. Confirm, or pass the break to ${loserName}.`,
      [
        {
          text: `${loserName} breaks`,
          onPress: async () => {
            await startMatch({
              players,
              raceTo: target,
              initialBreakerSlot: tossLoser,
              challongeMatchId,
              challongeTournamentSlug: challongeSlug,
            });
            router.replace('/match/scoring');
          },
        },
        {
          text: `${winnerName} breaks`,
          style: 'default',
          isPreferred: true,
          onPress: async () => {
            await startMatch({
              players,
              raceTo: target,
              initialBreakerSlot: tossWinner,
              challongeMatchId,
              challongeTournamentSlug: challongeSlug,
            });
            router.replace('/match/scoring');
          },
        },
      ]
    );
  };

  const otherSlotId =
    pickerSlot === 0 ? p2?.id : pickerSlot === 1 ? p1?.id : undefined;

  return (
    <View style={styles.container}>
      {challongeMatchId !== undefined && (
        <View style={styles.challongeBanner}>
          <Text style={styles.challongeBannerLabel}>FROM CHALLONGE</Text>
          <Text style={styles.challongeBannerText}>
            Result will sync back to {challongeSlug ?? 'your tournament'}.
          </Text>
        </View>
      )}
      {prefillError && (
        <View style={styles.prefillError}>
          <Text style={styles.prefillErrorText}>{prefillError}</Text>
        </View>
      )}
      <PlayerSlot
        label="Player 1"
        player={p1}
        onPress={() => setPickerSlot(0)}
        onClear={() => setP1(null)}
      />
      <PlayerSlot
        label="Player 2"
        player={p2}
        onPress={() => setPickerSlot(1)}
        onClear={() => setP2(null)}
      />

      <Text style={styles.label}>Race to (points)</Text>
      <TextInput
        style={styles.input}
        value={raceTo}
        onChangeText={setRaceTo}
        keyboardType="number-pad"
        placeholder="100"
        placeholderTextColor={colors.textTertiary}
      />

      <Pressable
        onPress={onStart}
        disabled={!canStart}
        style={({ pressed }) => [
          styles.cta,
          !canStart && { opacity: 0.4 },
          pressed && canStart && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.ctaText}>Start Match</Text>
      </Pressable>

      <PlayerPicker
        visible={pickerSlot !== null}
        title={pickerSlot === 0 ? 'Choose Player 1' : 'Choose Player 2'}
        disabledPlayerIds={otherSlotId ? [otherSlotId] : []}
        onClose={() => setPickerSlot(null)}
        onPick={(player) => {
          if (pickerSlot === 0) setP1(player);
          else if (pickerSlot === 1) setP2(player);
          setPickerSlot(null);
        }}
      />
    </View>
  );
}

function PlayerSlot({
  label,
  player,
  onPress,
  onClear,
}: {
  label: string;
  player: Player | null;
  onPress: () => void;
  onClear: () => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.slot,
          pressed && { opacity: 0.85 },
        ]}
      >
        {player ? (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{playerInitials(player)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotName}>{playerFullName(player)}</Text>
              <Text style={styles.slotSub}>Tap to change</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={(e) => {
                e.stopPropagation?.();
                onClear();
              }}
            >
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                ?
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotPlaceholder}>Tap to choose…</Text>
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  slot: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: 'white', fontWeight: '800', fontSize: 16 },
  slotName: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  slotSub: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  slotPlaceholder: {
    color: colors.textSecondary,
    fontSize: 16,
    fontStyle: 'italic',
  },
  clear: {
    color: colors.textSecondary,
    fontSize: 20,
    paddingHorizontal: 6,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  ctaText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  challongeBanner: {
    backgroundColor: 'rgba(0,229,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.45)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  challongeBannerLabel: {
    color: colors.p2,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 2,
  },
  challongeBannerText: {
    color: colors.textPrimary,
    fontSize: 13,
  },
  prefillError: {
    backgroundColor: 'rgba(255,69,58,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.5)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  prefillErrorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
