import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, playerColor } from '@/theme/colors';
import { useRosterStore } from '@/store/rosterStore';
import { PlayerEditSheet } from '@/components/PlayerEditSheet';
import { playerFullName, playerInitials, type Player } from '@/domain/types';

export default function Roster() {
  const players = useRosterStore((s) => s.players);
  const refresh = useRosterStore((s) => s.refresh);
  const add = useRosterStore((s) => s.add);
  const update = useRosterStore((s) => s.update);
  const remove = useRosterStore((s) => s.remove);

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Player | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? players.filter((p) =>
        playerFullName(p).toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q)
      )
    : players;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search players..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="words"
        />
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {players.length === 0 ? 'No players yet' : 'No matches'}
          </Text>
          <Text style={styles.emptyBody}>
            {players.length === 0
              ? 'Tap + Add to create your first player. They\u2019ll be available in every new match.'
              : 'Try a different search, or add a new player.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => setEditing(item)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: playerColor((index % 2) as 0 | 1) },
                ]}
              >
                <Text style={styles.avatarText}>{playerInitials(item)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{playerFullName(item)}</Text>
                {item.phone && (
                  <Text style={styles.sub}>{item.phone}</Text>
                )}
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          )}
        />
      )}

      <PlayerEditSheet
        visible={adding}
        initialFirstName={query}
        onClose={() => setAdding(false)}
        onSave={async (input) => {
          await add(input);
          setQuery('');
        }}
      />

      <PlayerEditSheet
        visible={!!editing}
        initial={editing ?? undefined}
        allowDelete
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (editing) await update(editing.id, input);
        }}
        onDelete={async () => {
          if (editing) await remove(editing.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
  },
  addBtnText: { color: 'white', fontWeight: '800', letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyBody: { color: colors.textSecondary, textAlign: 'center' },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: 'white', fontWeight: '800' },
  name: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.textTertiary, fontSize: 13, marginTop: 2 },
  chev: { color: colors.textTertiary, fontSize: 26, paddingHorizontal: 6 },
});
