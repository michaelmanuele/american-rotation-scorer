import { useEffect, useState } from 'react';
import {
  Alert,
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
import type { Player } from '@/domain/types';
import type { PlayerInput } from '@/db/players';

interface Props {
  visible: boolean;
  initial?: Player | null;          // null/undefined => Add mode
  initialFirstName?: string;        // prefill when adding from search
  allowDelete?: boolean;
  onClose: () => void;
  onSave: (input: PlayerInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export function PlayerEditSheet({
  visible,
  initial,
  initialFirstName,
  allowDelete,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isEdit = !!initial;
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (visible) {
      setFirst(initial?.firstName ?? initialFirstName ?? '');
      setLast(initial?.lastName ?? '');
      setPhone(initial?.phone ?? '');
    }
  }, [visible, initial, initialFirstName]);

  const canSave = first.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({
      firstName: first.trim(),
      lastName: last.trim(),
      phone: phone.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Player?',
      'This will remove the player from your roster. Past match records are unaffected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await onDelete();
            onClose();
          },
        },
      ]
    );
  };

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
          <Text style={styles.title}>{isEdit ? 'Edit Player' : 'Add Player'}</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={first}
            onChangeText={setFirst}
            autoFocus
            autoCapitalize="words"
            placeholder="First"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="next"
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={last}
            onChangeText={setLast}
            autoCapitalize="words"
            placeholder="Last (optional)"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="next"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Phone (optional)"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <View style={styles.actions}>
            {allowDelete && onDelete && (
              <Pressable onPress={handleDelete} style={styles.delete}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={[styles.save, !canSave && { opacity: 0.4 }]}
            >
              <Text style={styles.saveText}>{isEdit ? 'Save' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    padding: 20,
    paddingBottom: 36,
    gap: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  delete: {
    marginRight: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deleteText: { color: colors.danger, fontWeight: '700' },
  cancel: { paddingHorizontal: 14, paddingVertical: 12 },
  cancelText: { color: colors.textSecondary, fontWeight: '700' },
  save: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveText: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 1 },
});
