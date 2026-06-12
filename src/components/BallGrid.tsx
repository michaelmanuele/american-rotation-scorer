import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BALLS } from '@/domain/rules';
import { PoolBall } from './PoolBall';

interface Props {
  pocketedBy: Record<number, 0 | 1 | undefined>;
  onTapBall: (ball: number) => void;
}

/**
 * 5-column ball grid (1-15).
 * Ball size auto-scales to screen width.
 */
export function BallGrid({ pocketedBy, onTapBall }: Props) {
  const { width } = useWindowDimensions();
  const padding = 12;
  const gap = 12;
  const cols = 5;
  const available = width - padding * 2 - gap * (cols - 1);
  const size = Math.min(96, Math.floor(available / cols));

  return (
    <View style={[styles.grid, { padding }]}>
      {BALLS.map((b) => (
        <PoolBall
          key={b}
          ball={b}
          size={size}
          pocketedBy={pocketedBy[b]}
          onPress={() => onTapBall(b)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
