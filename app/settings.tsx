import { useCallback, useState } from 'react';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
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
  setMyParticipantId,
  setTournamentSlug,
  clearChallongeSettings,
} from '@/services/settings';
import {
  ChallongeError,
  NotSignedInError,
  getTournament,
  parseTournamentSlug,
  type ChallongeParticipant,
  type ChallongeTournament,
} from '@/services/challonge';
import { isSignedIn, useChallongeSignIn } from '@/services/auth';

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; tournament: ChallongeTournament }
  | { kind: 'error'; message: string };

export default function Settings() {
  const [slugInput, setSlugInput] = useState('');
  const [myId, setMyId] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const { ready: signInReady, signIn: promptChallongeSignIn } = useChallongeSignIn();

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, si] = await Promise.all([
      loadChallongeSettings(),
      isSignedIn(),
    ]);
    setSignedIn(si);
    setSlugInput(s.slug ?? '');
    setMyId(s.myParticipantId);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onSignIn = async () => {
    if (!signInReady) {
      Alert.alert('Sign-in not ready', 'Please wait a moment and try again.');
      return;
    }
    setSigningIn(true);
    try {
      // DEBUG: always surface the result so we can see what's happening.
      const result = await promptChallongeSignIn();
      if (!result.ok) {
        Alert.alert('Sign-in result', `Not OK: ${result.error}`);
        return;
      }
      Alert.alert('Sign-in result', 'Success \u2014 tokens saved.');
      await reload();
      // Auto-test if we already have a slug configured.
      const s = await loadChallongeSettings();
      if (s.slug) {
        void onTest();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Sign-in threw', msg);
    } finally {
      setSigningIn(false);
    }
  };

  const onSignOut = () => {
    Alert.alert(
      'Sign out of Challonge?',
      'This removes your Challonge sign-in, tournament slug, and \u201Cthis is me\u201D selection from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
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

  const onTest = async () => {
    setTest({ kind: 'testing' });
    try {
      if (!(await isSignedIn())) {
        setTest({ kind: 'error', message: 'Sign in with Challonge first.' });
        return;
      }
      const s = await loadChallongeSettings();
      const effectiveSlug = parseTournamentSlug(slugInput.trim() || s.slug || '');
      if (!effectiveSlug) {
        setTest({ kind: 'error', message: 'Enter a tournament URL or slug.' });
        return;
      }
      const tournament = await getTournament(effectiveSlug);
      setTest({ kind: 'ok', tournament });
    } catch (err) {
      const message =
        err instanceof NotSignedInError
          ? 'Not signed in to Challonge.'
          : err instanceof ChallongeError
          ? err.isAuth
            ? 'Sign-in expired. Sign in again.'
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
      const slug = parseTournamentSlug(slugInput.trim());
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

      {/* Sign-in card ------------------------------------------------------ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        {signedIn ? (
          <>
            <View style={styles.statusRow}>
              <View style={styles.statusDotOn} />
              <Text style={styles.statusText}>Signed in</Text>
            </View>
            <Pressable
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.btnSecondary,
                { marginTop: 12 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.btnSecondaryText}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.statusRow}>
              <View style={styles.statusDotOff} />
              <Text style={styles.statusText}>Not signed in</Text>
            </View>
            <Text style={[styles.help, { marginTop: 6 }]}>
              Signing in with Challonge lets you post scores directly to the
              bracket as yourself.
            </Text>
            <Pressable
              onPress={onSignIn}
              disabled={signingIn || !signInReady}
              style={({ pressed }) => [
                styles.btnPrimary,
                { marginTop: 12 },
                pressed && { opacity: 0.85 },
                (signingIn || !signInReady) && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.btnPrimaryText}>
                {signingIn ? 'Opening Challonge\u2026' : 'Sign in with Challonge'}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Tournament slug --------------------------------------------------- */}
      <Text style={[styles.label, { marginTop: 24 }]}>Tournament</Text>
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
          disabled={test.kind === 'testing' || !signedIn}
          style={({ pressed }) => [
            styles.btnSecondary,
            pressed && { opacity: 0.85 },
            (test.kind === 'testing' || !signedIn) && { opacity: 0.4 },
          ]}
        >
          <Text style={styles.btnSecondaryText}>
            {test.kind === 'testing' ? 'Testing\u2026' : 'Test Connection'}
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
            {saving ? 'Saving\u2026' : 'Save'}
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

      <View style={styles.versionRow}>
        <Text style={styles.versionText}>
          v{Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?'}
          {'  \u00b7  build '}
          {Application.nativeBuildVersion ?? '?'}
        </Text>
        <Text style={[styles.versionText, { marginTop: 4, fontSize: 10 }]}>
          OAuth base: {(Constants.expoConfig?.extra as any)?.oauthBaseUrl ?? '(missing)'}
        </Text>
        <Text style={[styles.versionText, { marginTop: 2, fontSize: 10 }]}>
          Scheme: {Constants.expoConfig?.scheme as string ?? '(missing)'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  versionRow: {
    marginTop: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  versionText: {
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 0.5,
  },
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDotOn: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  statusDotOff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
    marginRight: 8,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
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
});
