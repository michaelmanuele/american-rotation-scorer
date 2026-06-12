import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme/colors';
import { getDB } from '@/db/database';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDB();
        if (!cancelled) setDbReady(true);
      } catch (err) {
        if (!cancelled) {
          setDbError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dbError) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>Database error</Text>
        <Text style={styles.errorBody}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.bgBottom },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'AR Scorer' }} />
        <Stack.Screen name="match/new" options={{ title: 'New Match' }} />
        <Stack.Screen
          name="match/scoring"
          options={{ title: 'Scoring', headerBackVisible: false }}
        />
        <Stack.Screen name="match/summary" options={{ title: 'Summary' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
        <Stack.Screen name="roster" options={{ title: 'Players' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bgBottom,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    letterSpacing: 2,
    fontSize: 12,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorBody: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
