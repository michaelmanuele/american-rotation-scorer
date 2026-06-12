import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme/colors';

export default function RootLayout() {
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
