import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BALLS } from '@/domain/rules';
import { PoolBall } from './PoolBall';

interface Props {
  pocketedBy: Record<number, 0 | 1 | undefined>;
  onTapBall: (ball: number) => void;
  /** Optional fixed available width (px); when omitted uses window width minus padding. */
  availableWidth?: number;
  /** Optional fixed available height (px); when omitted, balls auto-size from width only. */
  availableHeight?: number;
}

const COLS = 5;
const ROWS = 3;
const COL_GAP = 12;
const ROW_GAP = 14;
const SIDE_PADDING = 12;

/**
 * Explicit 3 rows x 5 columns grid of pool balls.
 * Ball size scales to use the available width (and height if provided).
 */
export function BallGrid({
  pocketedBy,
  onTapBall,
  availableWidth,
  availableHeight,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const widthBudget = (availableWidth ?? winW) - SIDE_PADDING * 2;
  const sizeFromWidth = Math.floor((widthBudget - COL_GAP * (COLS - 1)) / COLS);

  let size = sizeFromWidth;
  if (availableHeight) {
    const sizeFromHeight = Math.floor(
      (availableHeight - ROW_GAP * (ROWS - 1)) / ROWS
    );
    size = Math.min(sizeFromWidth, sizeFromHeight);
  }
  size = Math.max(56, Math.min(size, 140));

  // Group balls into rows
  const rows: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(BALLS.slice(r * COLS, r * COLS + COLS) as number[]);
  }

  return (
    <View style={[styles.grid, { paddingHorizontal: SIDE_PADDING }]}>
      {rows.map((row, idx) => (
        <View
          key={idx}
          style={[
            styles.row,
            { marginTop: idx === 0 ? 0 : ROW_GAP, gap: COL_GAP },
          ]}
        >
          {row.map((b) => (
            <PoolBall
              key={b}
              ball={b}
              size={size}
              pocketedBy={pocketedBy[b]}
              onPress={() => onTapBall(b)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
