import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors } from '@/theme/colors';
import {
  deleteMatch,
  listCompletedMatches,
  type MatchSummary,
} from '@/db/matches';
import { playerFullName } from '@/domain/types';

export default function History() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listCompletedMatches();
    setMatches(list);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onDelete = (m: MatchSummary) => {
    Alert.alert(
      'Delete match?',
      `${playerFullName(m.player1)} vs ${playerFullName(m.player2)} will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMatch(m.id);
            await refresh();
          },
        },
      ]
    );
  };

  if (loaded && matches.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptyBody}>
          Completed matches will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={matches}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <ReanimatedSwipeable
          renderRightActions={() => (
            <Pressable
              onPress={() => onDelete(item)}
              style={styles.deleteAction}
            >
              <Text style={styles.deleteActionText}>Delete</Text>
            </Pressable>
          )}
          overshootRight={false}
          rightThreshold={48}
        >
          <Pressable
            onPress={() =>
              router.push(`/match/summary?id=${item.id}` as any)
            }
            style={({ pressed }) => [
              styles.row,
              pressed && { opacity: 0.85 },
            ]}
          >
            <MatchRowContent m={item} />
          </Pressable>
        </ReanimatedSwipeable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

function MatchRowContent({ m }: { m: MatchSummary }) {
  const date = formatDate(m.endedAt ?? m.startedAt);
  const winName =
    m.winnerSlot === 0
      ? playerFullName(m.player1)
      : m.winnerSlot === 1
      ? playerFullName(m.player2)
      : null;
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>
        {playerFullName(m.player1)}{' '}
        <Text style={styles.score}>{m.p1Score}</Text>
        <Text style={styles.vs}>  —  </Text>
        <Text style={styles.score}>{m.p2Score}</Text>{' '}
        {playerFullName(m.player2)}
      </Text>
      <Text style={styles.rowSub}>
        {winName ? `Winner: ${winName} · ` : ''}
        Race to {m.raceTo} · {m.framesPlayed} frame
        {m.framesPlayed === 1 ? '' : 's'}
      </Text>
      <Text style={styles.rowMeta}>{date}</Text>
    </View>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  list: { padding: 12 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyBody: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  score: {
    color: colors.primary,
    fontWeight: '800',
  },
  vs: {
    color: colors.textTertiary,
    fontWeight: '700',
  },
  rowSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  rowMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  deleteAction: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteActionText: {
    color: 'white',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
