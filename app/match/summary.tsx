import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

/**
 * Placeholder summary screen. M5 will read the last completed match from
 * SQLite and render totals, duration, balls pocketed, avg pts/frame, best frame.
 */
export default function Summary() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Complete</Text>
      <Text style={styles.subtitle}>
        Full summary stats (duration, balls pocketed, avg pts/frame, best frame)
        coming in M5.
      </Text>
      <Pressable
        style={styles.btn}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.btnText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 1 },
});
