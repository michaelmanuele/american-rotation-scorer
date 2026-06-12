import React from 'react';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Rect,
  ClipPath,
} from 'react-native-svg';
import { BALL_COLORS, ballClass } from '@/domain/rules';
import { colors } from '@/theme/colors';

interface Props {
  ball: number;             // 1..15
  size?: number;
  pocketedBy?: 0 | 1;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Pool ball rendering.
 * - Solids (1-8): full colored circle with white number disc.
 * - Stripes (9-15): white circle with colored stripe band.
 * - When pocketed: heavy color wash, thick owner ring, "checked" overlay
 *   so it's unmistakable at a glance which player pocketed it.
 */
export function PoolBall({ ball, size = 96, pocketedBy, onPress, disabled }: Props) {
  const cls = ballClass(ball);
  const base = BALL_COLORS[ball];
  const r = size / 2;
  const numberDiscR = size * 0.3;
  const isPocketed = pocketedBy === 0 || pocketedBy === 1;
  const ownerColor = pocketedBy === 0 ? colors.p1 : pocketedBy === 1 ? colors.p2 : null;

  // Outer wrapper sizes include space for the owner ring
  const ringPad = isPocketed ? 6 : 0;
  const outerSize = size + ringPad * 2;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        { width: outerSize, height: outerSize },
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      {/* Thick owner ring (around the ball when pocketed) */}
      {ownerColor && (
        <View
          style={[
            styles.ring,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              borderColor: ownerColor,
            },
          ]}
        />
      )}

      <Svg width={size} height={size} style={{ position: 'absolute', top: ringPad, left: ringPad }}>
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
            <Circle cx={r} cy={r} r={r} fill="#F5F1E6" />
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
          <Circle cx={r} cy={r} r={r} fill={base} />
        )}

        {/* Number disc */}
        <Circle cx={r} cy={r} r={numberDiscR} fill="#F5F1E6" />

        {/* Specular highlight */}
        <Circle cx={r} cy={r} r={r} fill={`url(#g-${ball})`} />
      </Svg>

      {/* Number text on top of SVG */}
      <View pointerEvents="none" style={[styles.numberWrap, { top: ringPad, left: ringPad, width: size, height: size }]}>
        <Text style={[styles.number, { fontSize: size * 0.3 }]}>{ball}</Text>
      </View>

      {/* Strong color wash + owner badge when pocketed */}
      {ownerColor && (
        <>
          {/* Saturated overlay tinting the whole ball */}
          <View
            pointerEvents="none"
            style={[
              styles.wash,
              {
                top: ringPad,
                left: ringPad,
                width: size,
                height: size,
                borderRadius: r,
                backgroundColor: ownerColor + 'B3', // ~70% alpha
              },
            ]}
          />
          {/* Owner badge (checkmark dot) in upper-right */}
          <View
            pointerEvents="none"
            style={[
              styles.badge,
              {
                backgroundColor: ownerColor,
                width: size * 0.34,
                height: size * 0.34,
                borderRadius: (size * 0.34) / 2,
                top: ringPad - size * 0.06,
                right: ringPad - size * 0.06,
              },
            ]}
          >
            <Text style={[styles.badgeText, { fontSize: size * 0.22 }]}>✓</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 4,
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
  wash: {
    position: 'absolute',
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontWeight: '900',
  },
});
