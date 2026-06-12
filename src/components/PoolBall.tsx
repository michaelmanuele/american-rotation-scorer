import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect, ClipPath } from 'react-native-svg';
import { Text } from 'react-native';
import { BALL_COLORS, ballClass } from '@/domain/rules';
import { colors } from '@/theme/colors';

interface Props {
  ball: number;                    // 1..15
  size?: number;
  pocketedBy?: 0 | 1;              // tint overlay color
  unpocketedTint?: 'neutral';      // future-proof
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Realistic-ish pool ball rendering with SVG.
 * - Solids (1-7, 8): full colored circle with white number disc.
 * - Stripe (9-15): white circle with colored horizontal band + number disc.
 * - When pocketedBy is set: shows a colored ring + dim overlay to indicate ownership.
 */
export function PoolBall({ ball, size = 72, pocketedBy, onPress, disabled }: Props) {
  const cls = ballClass(ball);
  const base = BALL_COLORS[ball];
  const r = size / 2;
  const numberDiscR = size * 0.28;
  const ownerColor =
    pocketedBy === 0 ? colors.p1 : pocketedBy === 1 ? colors.p2 : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        { width: size, height: size },
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      {/* Owner ring */}
      {ownerColor && (
        <View
          style={[
            styles.ring,
            {
              width: size + 8,
              height: size + 8,
              borderRadius: (size + 8) / 2,
              borderColor: ownerColor,
            },
          ]}
        />
      )}

      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`g-${ball}`} cx="35%" cy="30%" r="75%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="40%" stopColor="#FFFFFF" stopOpacity={0.05} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.25} />
          </RadialGradient>
          <ClipPath id={`clip-${ball}`}>
            <Circle cx={r} cy={r} r={r} />
          </ClipPath>
        </Defs>

        {cls === 'stripe' ? (
          <>
            {/* White base */}
            <Circle cx={r} cy={r} r={r} fill="#F5F1E6" />
            {/* Colored stripe band */}
            <Rect
              x={0}
              y={r - size * 0.28}
              width={size}
              height={size * 0.56}
              fill={base}
              clipPath={`url(#clip-${ball})`}
            />
          </>
        ) : (
          // Solid (1-7) or 8-ball
          <Circle cx={r} cy={r} r={r} fill={base} />
        )}

        {/* Number disc */}
        <Circle cx={r} cy={r} r={numberDiscR} fill="#F5F1E6" />

        {/* Specular highlight */}
        <Circle cx={r} cy={r} r={r} fill={`url(#g-${ball})`} />
      </Svg>

      {/* Number text (rendered on top of SVG; cheaper than text-in-SVG for RN) */}
      <View pointerEvents="none" style={styles.numberWrap}>
        <Text style={[styles.number, { fontSize: size * 0.28 }]}>{ball}</Text>
      </View>

      {/* Dim overlay when pocketed */}
      {ownerColor && (
        <View
          pointerEvents="none"
          style={[
            styles.dim,
            {
              width: size,
              height: size,
              borderRadius: r,
              backgroundColor: ownerColor + '55',
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 6,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
  },
  numberWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: '#1B2A33',
    fontWeight: '800',
  },
  dim: {
    position: 'absolute',
  },
});
