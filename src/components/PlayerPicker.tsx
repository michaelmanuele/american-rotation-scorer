import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/theme/colors';
import { useRosterStore } from '@/store/rosterStore';
import { playerFullName, playerInitials, type Player } from '@/domain/types';
import { PlayerEditSheet } from './PlayerEditSheet';

interface Props {
  visible: boolean;
  title?: string;
  disabledPlayerIds?: string[];   // hide/disable already-picked player (e.g. opposing slot)
  onClose: () => void;
  onPick: (player: Player) => void;
}

/**
 * Modal picker for choosing a player from the roster.
 * - Live substring search across first/last/full name
 * - Inline "+ Add 'typed name'" affordance when no match
 * - Selecting a player triggers onPick and closes
 */
export function PlayerPicker({
  visible,
  title = 'Choose Player',
  disabledPlayerIds = [],
  onClose,
  onPick,
}: Props) {
  const players = useRosterStore((s) => s.players);
  const refresh = useRosterStore((s) => s.refresh);
  const add = useRosterStore((s) => s.add);

  const [query, setQuery] = useState('');
  const [addSheet, setAddSheet] = useState(false);

  useEffect(() => {
    if (visible) {
      refresh();
      setQuery('');
    }
  }, [visible, refresh]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? players.filter(
        (p) =>
          playerFullName(p).toLowerCase().includes(q) ||
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q)
      )
    : players;

  const exactMatch = q
    ? players.some((p) => playerFullName(p).toLowerCase() === q || p.firstName.toLowerCase() === q)
    : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="words"
            placeholder="Search or type a new name..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
          />

          <FlatList
            data={filtered}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(p) => p.id}
            ListHeaderComponent={
              q && !exactMatch ? (
                <Pressable
                  onPress={() => setAddSheet(true)}
                  style={({ pressed }) => [
                    styles.addNewRow,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.addPlus}>
                    <Text style={styles.addPlusText}>+</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addNewTitle}>Add new player</Text>
                    <Text style={styles.addNewSub}>“{query.trim()}”</Text>
                  </View>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              !q ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    No players yet. Type a name above to add your first one.
                  </Text>
                </View>
              ) : exactMatch ? null : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No matches.</Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const disabled = disabledPlayerIds.includes(item.id);
              return (
                <Pressable
                  disabled={disabled}
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    disabled && { opacity: 0.35 },
                    pressed && !disabled && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {playerInitials(item)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{playerFullName(item)}</Text>
                    {disabled && (
                      <Text style={styles.sub}>Already selected</Text>
                    )}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <PlayerEditSheet
        visible={addSheet}
        initialFirstName={query.trim()}
        onClose={() => setAddSheet(false)}
        onSave={async (input) => {
          const created = await add(input);
          onPick(created);
          onClose();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.bgBottom,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    maxHeight: '85%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  close: { color: colors.textSecondary, fontSize: 22, paddingHorizontal: 4 },
  search: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: 'white', fontWeight: '800' },
  name: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.textTertiary, fontSize: 13, marginTop: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
  addNewRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  addPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlusText: { color: 'white', fontWeight: '800', fontSize: 22 },
  addNewTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  addNewSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
});
