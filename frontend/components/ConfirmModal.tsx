import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Typography } from './Typography';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: 'destructive' | 'default';
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  variant = 'destructive',
}: ConfirmModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.backdrop} 
        onPress={loading ? undefined : onClose}
      >
        <View style={styles.centeredView}>
          <Pressable 
            style={styles.modalView} 
            className="bg-white dark:bg-[#1E1E22] border border-[#E4E4E7] dark:border-[#2D2D30]"
            onPress={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
          >
            {/* Warning / Alert Icon */}
            <View style={styles.iconContainer} className={variant === 'destructive' ? 'bg-[#FCEBEB] dark:bg-[#301213]' : 'bg-[#EAF1FE] dark:bg-[#111E33]'}>
              <Feather 
                name={variant === 'destructive' ? 'alert-triangle' : 'info'} 
                size={24} 
                color={variant === 'destructive' ? '#C2281F' : '#3652E3'} 
              />
            </View>

            {/* Content */}
            <Typography variant="h3" weight="semibold" className="text-[#18181B] dark:text-[#FAFAFA] text-center mt-3 mb-2">
              {title}
            </Typography>
            
            <Typography variant="caption" className="text-[#71717A] dark:text-[#A1A1AA] text-center mb-6 leading-5 px-2">
              {description}
            </Typography>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                variant="outline"
                label={cancelText}
                onPress={onClose}
                disabled={loading}
                className="flex-1 border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl"
              />
              <Button
                variant={variant === 'destructive' ? 'destructive' : 'default'}
                label={confirmText}
                onPress={onConfirm}
                loading={loading}
                disabled={loading}
                className={`flex-1 rounded-xl ${variant === 'destructive' ? 'bg-[#C2281F]' : 'bg-[#3652E3]'}`}
              />
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '90%',
    maxWidth: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.15)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
