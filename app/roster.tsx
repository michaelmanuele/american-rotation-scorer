import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export default function Roster() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Players</Text>
      <Text style={styles.subtitle}>
        Roster management coming in M1 (add/edit, SQLite-backed).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, marginTop: 8 },
});
