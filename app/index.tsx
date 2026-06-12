import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>AMERICAN ROTATION</Text>
      <Text style={styles.tag}>Scorer</Text>

      <View style={styles.menu}>
        <MenuButton href="/match/new" label="New Match" />
        <MenuButton href="/history" label="History" />
        <MenuButton href="/roster" label="Players" />
      </View>
    </View>
  );
}

function MenuButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  tag: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  menu: { gap: 12 },
  btn: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },
});
