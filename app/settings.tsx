import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors } from '@/theme/colors';
import {
  loadChallongeSettings,
  setApiKey,
  setMyParticipantId,
  setTournamentSlug,
  clearChallongeSettings,
} from '@/services/settings';
import {
  ChallongeError,
  getTournament,
  parseTournamentSlug,
  type ChallongeParticipant,
  type ChallongeTournament,
} from '@/services/challonge';

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; tournament: ChallongeTournament }
  | { kind: 'error'; message: string };

export default function Settings() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [myId, setMyId] = useState<number | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });

  const reload = useCallback(async () => {
    setLoading(true);
    const s = await loadChallongeSettings();
    setHasSavedKey(!!s.apiKey);
    // Don't echo the saved key back into the input — show placeholder instead.
    setApiKeyInput('');
    setSlugInput(s.slug ?? '');
    setMyId(s.myParticipantId);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Effective values used for "Test Connection": fall back to saved if input blank.
  const onTest = async () => {
    setTest({ kind: 'testing' });
    try {
      const s = await loadChallongeSettings();
      const effectiveKey = apiKeyInput.trim() || s.apiKey || '';
      const effectiveSlug = parseTournamentSlug(slugInput.trim() || s.slug || '');
      if (!effectiveKey) {
        setTest({ kind: 'error', message: 'Enter your Challonge API key.' });
        return;
      }
      if (!effectiveSlug) {
        setTest({ kind: 'error', message: 'Enter a tournament URL or slug.' });
        return;
      }
      const tournament = await getTournament(effectiveKey, effectiveSlug);
      setTest({ kind: 'ok', tournament });
    } catch (err) {
      const message =
        err instanceof ChallongeError
          ? err.isAuth
            ? 'API key was rejected (401). Double-check the key.'
            : err.isNotFound
            ? 'Tournament not found (404). Check the slug.'
            : err.message
          : err instanceof Error
          ? err.message
          : 'Unknown error';
      setTest({ kind: 'error', message });
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const key = apiKeyInput.trim();
      const slug = parseTournamentSlug(slugInput.trim());
      if (key) await setApiKey(key);
      if (slug) await setTournamentSlug(slug);
      await reload();
      Alert.alert('Saved', 'Challonge settings saved.');
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSaving(false);
    }
  };

  const onPickMe = async (p: ChallongeParticipant) => {
    await setMyParticipantId(p.id);
    setMyId(p.id);
  };

  const onClearAll = () => {
    Alert.alert(
      'Disconnect Challonge?',
      'This removes your API key, tournament slug, and "this is me" selection from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearChallongeSettings();
            setTest({ kind: 'idle' });
            await reload();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.section}>CHALLONGE</Text>

      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        placeholder={
          hasSavedKey ? '•••••••••••••• (saved)' : 'Paste your API v1 key'
        }
        placeholderTextColor={colors.textTertiary}
        value={apiKeyInput}
        onChangeText={setApiKeyInput}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Text style={styles.help}>
        Get yours at challonge.com → Settings → Developer API.
      </Text>

      <Text style={[styles.label, { marginTop: 18 }]}>Tournament</Text>
      <TextInput
        style={styles.input}
        placeholder="https://challonge.com/your_tournament  or  your_tournament"
        placeholderTextColor={colors.textTertiary}
        value={slugInput}
        onChangeText={setSlugInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.help}>
        The URL or slug of the current week&rsquo;s tournament.
      </Text>

      <View style={styles.btnRow}>
        <Pressable
          onPress={onTest}
          disabled={test.kind === 'testing'}
          style={({ pressed }) => [
            styles.btnSecondary,
            pressed && { opacity: 0.85 },
            test.kind === 'testing' && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.btnSecondaryText}>
            {test.kind === 'testing' ? 'Testing…' : 'Test Connection'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { opacity: 0.85 },
            saving && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      </View>

      {test.kind === 'error' && (
        <View style={styles.banner}>
          <Text style={styles.bannerErr}>{test.message}</Text>
        </View>
      )}

      {test.kind === 'ok' && (
        <View style={styles.banner}>
          <Text style={styles.bannerOk}>
            Connected to {test.tournament.name}
          </Text>
          <Text style={styles.bannerSub}>
            {test.tournament.participants.length} participants ·{' '}
            {test.tournament.state}
          </Text>

          <Text style={[styles.label, { marginTop: 16 }]}>This is me</Text>
          <Text style={styles.help}>
            Tap your name so the app can highlight your matches.
          </Text>

          <View style={{ marginTop: 8 }}>
            {test.tournament.participants.map((p) => {
              const selected = p.id === myId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onPickMe(p)}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[styles.rowText, selected && styles.rowTextSelected]}
                  >
                    {p.name}
                  </Text>
                  {selected && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {(hasSavedKey || myId !== null) && (
        <Pressable
          onPress={onClearAll}
          style={({ pressed }) => [
            styles.disconnect,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.disconnectText}>Disconnect Challonge</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  help: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: 'rgba(233,30,99,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.55)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  banner: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  bannerOk: { color: colors.p2, fontWeight: '800', fontSize: 15 },
  bannerErr: { color: colors.danger, fontWeight: '700' },
  bannerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  rowSelected: {
    backgroundColor: 'rgba(233,30,99,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,99,0.55)',
  },
  rowText: { color: colors.textPrimary, fontSize: 15, flex: 1 },
  rowTextSelected: { fontWeight: '800' },
  check: { color: colors.p1, fontWeight: '800', fontSize: 18 },
  disconnect: {
    marginTop: 28,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  disconnectText: {
    color: colors.danger,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
});
