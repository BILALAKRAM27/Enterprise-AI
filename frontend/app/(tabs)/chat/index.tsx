import { useState } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services/chat';
import { Typography } from '../../../components/Typography';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function ChatListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
  });

  const handleCreate = () => {
    if (!newChatTitle.trim()) return;
    createMutation.mutate(newChatTitle);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)}
      activeOpacity={0.7}
      className="mb-3"
    >
      <Card className="flex-row items-center justify-between border border-[#E4E4E7] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
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
        </View>
        <Feather name="chevron-right" size={18} color="#A1A1AA" />
      </Card>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]">
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
    </View>
  );
}