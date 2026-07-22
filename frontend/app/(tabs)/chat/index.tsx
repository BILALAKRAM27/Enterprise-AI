import { useState } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services/chat';
import { Typography } from '../../../components/Typography';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function ChatListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Deletion Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  // Hover & Focus states for Web delete button
  const [hoveredChatId, setHoveredChatId] = useState<number | null>(null);
  const [focusedChatId, setFocusedChatId] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: chats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['chats'],
    queryFn: chatService.getChats,
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => chatService.createChat(title),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setNewChatTitle('');
      setIsCreating(false);
      router.push(`/(tabs)/chat/${newChat.id}` as any);
    },
    onError: () => {
      showToast('Failed to create conversation', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: chatService.deleteChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      showToast('Conversation deleted successfully');
    },
    onError: () => {
      showToast('Failed to delete conversation', 'error');
    },
    onSettled: () => {
      setDeletingChatId(null);
      setDeleteModalVisible(false);
    }
  });

  const handleCreate = () => {
    if (!newChatTitle.trim()) return;
    createMutation.mutate(newChatTitle);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isHovered = hoveredChatId === item.id;
    const isFocused = focusedChatId === item.id;
    
    // Show delete button always on mobile, and on hover/focus on web
    const showDeleteButton = Platform.OS !== 'web' || isHovered || isFocused;

    return (
      <View
        // @ts-ignore
        onMouseEnter={() => setHoveredChatId(item.id)}
        // @ts-ignore
        onMouseLeave={() => setHoveredChatId(null)}
        className="mb-3"
      >
        <Card className="flex-row items-center justify-between border border-[#E4E4E7] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl relative shadow-xs">
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)}
            activeOpacity={0.7}
            // @ts-ignore
            onFocus={() => setFocusedChatId(item.id)}
            // @ts-ignore
            onBlur={() => setFocusedChatId(null)}
            className="flex-row items-center gap-3 flex-1 pr-2"
          >
            <View className="rounded-xl bg-[#EEF1FF] p-3 dark:bg-[#161B33]">
              <Feather name="message-square" size={18} color="#3652E3" />
            </View>
            <View className="flex-1">
              <Typography variant="body" weight="semibold" numberOfLines={1} className="text-[#18181B] dark:text-[#FAFAFA]">
                {item.title}
              </Typography>
              <Typography variant="caption" color="muted" className="font-mono text-xs mt-0.5">
                {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-1">
            {showDeleteButton ? (
              <TouchableOpacity
                activeOpacity={0.7}
                className="h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:opacity-100"
                onPress={() => {
                  setDeletingChatId(item.id);
                  setDeleteModalVisible(true);
                }}
              >
                <Feather name="trash-2" size={18} color="#C2281F" />
              </TouchableOpacity>
            ) : (
              <Feather name="chevron-right" size={18} color="#A1A1AA" style={{ marginRight: 8 }} />
            )}
          </View>
        </Card>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]">
      {toast && (
        <View 
          style={styles.toastContainer} 
          className={toast.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}
        >
          <Feather 
            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'} 
            size={18} 
            color="white" 
          />
          <Typography color="white" weight="semibold" className="text-sm">
            {toast.message}
          </Typography>
        </View>
      )}

      <View className="mx-auto w-full max-w-[1120px] flex-1 px-6 pb-6 pt-16 md:px-8">
        <Typography variant="h1" weight="bold" className="mb-6 text-[#18181B] dark:text-[#FAFAFA] tracking-tight">
          Conversations
        </Typography>

        {isCreating ? (
          <Card className="mb-6 border border-[#E4E4E7] bg-white p-5 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl">
            <Input
              placeholder="What do you want to ask?"
              value={newChatTitle}
              onChangeText={setNewChatTitle}
              onSubmitEditing={handleCreate}
              autoFocus
              className="bg-[#FFFFFF] dark:bg-[#1C1E23] border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-base h-11 px-4 text-[#18181B] dark:text-[#FAFAFA]"
            />
            <View className="flex-row justify-end gap-2 mt-4">
              <Button
                label="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setIsCreating(false)}
                className="h-10 rounded-xl px-4"
              />
              <Button
                label="Start Chat"
                size="sm"
                onPress={handleCreate}
                loading={createMutation.isPending}
                disabled={!newChatTitle.trim()}
                className="bg-[#3652E3] hover:bg-[#2A3FB8] h-10 rounded-xl px-5"
              />
            </View>
          </Card>
        ) : (
          <Button
            label="New Conversation"
            icon={<Feather name="plus" size={18} color="#fff" />}
            className="mb-6 bg-[#3652E3] active:bg-[#2A3FB8] h-12 rounded-xl"
            onPress={() => setIsCreating(true)}
          />
        )}

        <FlatList
          data={chats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3652E3" />}
          ListEmptyComponent={
            !isLoading ? (
              <View className="mt-20 items-center justify-center px-4">
                <View className="mb-4 rounded-full bg-zinc-100 p-6 dark:bg-zinc-800">
                  <Feather name="message-square" size={40} color="#A1A1AA" />
                </View>
                <Typography variant="h3" weight="semibold" className="mb-2 text-[#18181B] dark:text-[#FAFAFA]">
                  No chats yet
                </Typography>
                <Typography variant="body" color="muted" className="text-center max-w-[280px]">
                  Start a conversation to query and synthesize your imported documentation instantly.
                </Typography>
              </View>
            ) : null
          }
        />
      </View>

      <ConfirmModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          if (deletingChatId !== null) {
            deleteMutation.mutate(deletingChatId);
          }
        }}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This will permanently remove all messages and citations associated with it. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: '5%',
    right: '5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    zIndex: 9999,
  }
});