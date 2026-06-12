import { useState } from 'react';
import { router } from 'expo-router';
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
import { playerFullName, type Player } from '@/domain/types';

/**
 * Minimal new-match setup. After tapping Start:
 * 1. Builds two ephemeral Player objects.
 * 2. Runs a virtual coin toss for the first break.
 * 3. Prompts the user to confirm the breaker (or pick the other player).
 * 4. Starts the match with the confirmed initial breaker.
 */
export default function NewMatch() {
  const startMatch = useMatchStore((s) => s.startMatch);
  const [p1First, setP1First] = useState('');
  const [p1Last, setP1Last] = useState('');
  const [p2First, setP2First] = useState('');
  const [p2Last, setP2Last] = useState('');
  const [raceTo, setRaceTo] = useState('100');

  const canStart =
    p1First.trim().length > 0 &&
    p2First.trim().length > 0 &&
    Number.parseInt(raceTo, 10) > 0;

  const onStart = () => {
    const now = Date.now();
    const players: [Player, Player] = [
      {
        id: `p_${now}_1`,
        firstName: p1First.trim(),
        lastName: p1Last.trim(),
        createdAt: now,
      },
      {
        id: `p_${now}_2`,
        firstName: p2First.trim(),
        lastName: p2Last.trim(),
        createdAt: now,
      },
    ];
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
          onPress: () => {
            startMatch({
              players,
              raceTo: target,
              initialBreakerSlot: tossLoser,
            });
            router.replace('/match/scoring');
          },
        },
        {
          text: `${winnerName} breaks`,
          style: 'default',
          isPreferred: true,
          onPress: () => {
            startMatch({
              players,
              raceTo: target,
              initialBreakerSlot: tossWinner,
            });
            router.replace('/match/scoring');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Field
        label="Player 1"
        firstName={p1First}
        lastName={p1Last}
        onFirst={setP1First}
        onLast={setP1Last}
      />
      <Field
        label="Player 2"
        firstName={p2First}
        lastName={p2Last}
        onFirst={setP2First}
        onLast={setP2Last}
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
    </View>
  );
}

function Field({
  label,
  firstName,
  lastName,
  onFirst,
  onLast,
}: {
  label: string;
  firstName: string;
  lastName: string;
  onFirst: (v: string) => void;
  onLast: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="First"
          placeholderTextColor={colors.textTertiary}
          value={firstName}
          onChangeText={onFirst}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Last"
          placeholderTextColor={colors.textTertiary}
          value={lastName}
          onChangeText={onLast}
          autoCapitalize="words"
        />
      </View>
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
});
