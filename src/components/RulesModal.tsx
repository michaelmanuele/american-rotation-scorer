import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { RULES_SECTIONS } from '@/content/rules';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Full-screen scrollable modal showing the American Rotation rules summary.
 * Used from both the Home screen and the in-match Scoring screen.
 *
 * Design notes:
 * - Slides up (presentationStyle="pageSheet" gives iPad a nice card; the
 *   transparent backdrop on the sides keeps context visible behind it).
 * - Read-only — no edit, no copy. Content lives in src/content/rules.ts.
 * - Stays in the same visual language as the rest of the app (surface
 *   color, off-white text, primary teal for the close affordance).
 */
export function RulesModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>RULES</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
            accessibilityLabel="Close rules"
          >
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {RULES_SECTIONS.map((section, sIdx) => (
            <View
              key={section.title}
              style={[styles.section, sIdx > 0 && { marginTop: 24 }]}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.bullets.map((bullet, bIdx) => (
                <View key={bIdx} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}

          <Text style={styles.footer}>American Rotation — house rules summary</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBottom,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  section: {},
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 4,
  },
  bulletDot: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
    width: 18,
    lineHeight: 22,
  },
  bulletText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  footer: {
    color: colors.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 28,
    textTransform: 'uppercase',
  },
});
