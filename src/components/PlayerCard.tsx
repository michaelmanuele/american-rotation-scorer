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
  isBreaker?: boolean;          // ⚡ marker — current frame breaker
  onPress: () => void;          // tap anywhere on card to switch active shooter
}

/**
 * Player card. Tap anywhere on the card to make this player the active shooter.
 * - Avatar is filled with player color when active, neutral gray when inactive.
 * - Breaker indicator (small pill) shows when this player is breaking the current frame.
 */
export function PlayerCard({
  player,
  slot,
  active,
  matchScore,
  frameScore,
  isBreaker,
  onPress,
}: Props) {
  const accent = playerColor(slot);
  const avatarBg = active ? accent : colors.inactive;
  const numColor = active ? colors.textPrimary : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Set ${playerFullName(player)} as active shooter`}
      style={({ pressed }) => [
        styles.card,
        active && { borderColor: accent, borderWidth: 2 },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.initials}>{playerInitials(player)}</Text>
        </View>
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {playerFullName(player).toUpperCase()}
          </Text>
          {isBreaker && (
            <View style={[styles.breakerPill, { borderColor: accent }]}>
              <Text style={[styles.breakerText, { color: accent }]}>
                BREAKING
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.scores}>
        <View style={styles.scorePill}>
          <Text style={[styles.scoreNum, { color: numColor }]}>{matchScore}</Text>
          <Text style={styles.scoreLabel}>MATCH</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={[styles.scoreNum, { color: numColor }]}>{frameScore}</Text>
          <Text style={styles.scoreLabel}>FRAME</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderColor: 'transparent',
    borderWidth: 2,
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
  },
  breakerPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  breakerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  scores: { flexDirection: 'row', marginTop: 12, gap: 10 },
  scorePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  scoreNum: { fontSize: 56, fontWeight: '800' },
  scoreLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 2,
  },
});
