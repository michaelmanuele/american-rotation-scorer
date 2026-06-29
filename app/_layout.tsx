// Side-effect import: must be the very first import in the entry file.
// Required by react-native-gesture-handler on native platforms.
import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/theme/colors';
import { getDB } from '@/db/database';
import { useMatchStore } from '@/store/matchStore';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const hydrateFromDB = useMatchStore((s) => s.hydrateFromDB);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDB();
        // After DB is ready, restore any in-progress match into the store
        // so the Home banner / scoring screen can resume seamlessly.
        await hydrateFromDB();
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
  }, [hydrateFromDB]);

  if (dbError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.center}>
          <StatusBar style="light" />
          <Text style={styles.errorTitle}>Database error</Text>
          <Text style={styles.errorBody}>{dbError}</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!dbReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.center}>
          <StatusBar style="light" />
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        <Stack.Screen name="tournaments" options={{ title: 'Tournaments' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </GestureHandlerRootView>
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
