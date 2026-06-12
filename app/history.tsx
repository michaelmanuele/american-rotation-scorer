import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export default function History() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>
        Match history list will live here (SQLite-backed in M1/M5).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, marginTop: 8 },
});
