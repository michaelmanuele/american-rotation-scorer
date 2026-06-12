import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, playerColor } from '@/theme/colors';
import { playerFullName, playerInitials, type Player } from '@/domain/types';

interface Props {
  player: Player;
  slot: 0 | 1;
  active: boolean;
  matchScore: number;
  frameScore: number;
  onPress: () => void;       // tap to make this player the active shooter
}

/**
 * Mirrors the TotalPool player card pattern:
 * - Tap the initials avatar to switch turn.
 * - Avatar is colored when active, neutral when inactive.
 */
export function PlayerCard({
  player,
  slot,
  active,
  matchScore,
  frameScore,
  onPress,
}: Props) {
  const accent = playerColor(slot);
  const avatarBg = active ? accent : colors.inactive;
  const numColor = active ? colors.textPrimary : colors.textSecondary;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable
          onPress={onPress}
          hitSlop={12}
          style={({ pressed }) => [
            styles.avatar,
            { backgroundColor: avatarBg },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Set ${playerFullName(player)} as active shooter`}
        >
          <Text style={styles.initials}>{playerInitials(player)}</Text>
        </Pressable>
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {playerFullName(player).toUpperCase()}
        </Text>
      </View>

      <View style={styles.scores}>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreNum, { color: numColor }]}>{matchScore}</Text>
          <Text style={styles.scoreLabel}>MATCH</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreNum, { color: numColor }]}>{frameScore}</Text>
          <Text style={styles.scoreLabel}>FRAME</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: 'white', fontWeight: '800', fontSize: 20 },
  name: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 22,
    flexShrink: 1,
  },
  scores: { flexDirection: 'row', marginTop: 12 },
  scoreCol: { flex: 1, alignItems: 'center' },
  scoreNum: { fontSize: 56, fontWeight: '800' },
  scoreLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});
