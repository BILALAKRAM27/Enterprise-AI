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
    <TouchableOpacity onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)} activeOpacity={0.7}>
      <Card className="mb-3 flex-row items-center justify-between p-4">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
            <Feather name="message-square" size={20} color="#6366f1" />
          </View>
          <View className="flex-1">
            <Typography variant="body" weight="semibold" numberOfLines={1} className="mb-1">
              {item.title}
            </Typography>
            <Typography variant="caption" color="muted">
              {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#94a3b8" />
      </Card>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-50 p-4 pt-12 dark:bg-slate-900">
      <Typography variant="h1" weight="bold" className="mb-6">Conversations</Typography>

      {isCreating ? (
        <Card className="mb-6">
          <Input 
            placeholder="What do you want to ask?" 
            value={newChatTitle}
            onChangeText={setNewChatTitle}
            autoFocus
          />
          <View className="flex-row justify-end gap-2 mt-2 space-x-2">
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setIsCreating(false)} />
            <Button label="Start Chat" size="sm" onPress={handleCreate} loading={createMutation.isPending} />
          </View>
        </Card>
      ) : (
        <Button 
          label="New Conversation" 
          icon={<Feather name="plus" size={20} color="#fff" />} 
          className="mb-6"
          onPress={() => setIsCreating(true)}
        />
      )}

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="mt-20 items-center justify-center">
              <View className="mb-4 rounded-full bg-slate-200 p-6 dark:bg-slate-800">
                <Feather name="message-square" size={48} color="#94a3b8" />
              </View>
              <Typography variant="h3" weight="semibold" className="mb-2">No chats yet</Typography>
              <Typography variant="body" color="muted" className="text-center px-4">
                Start a new conversation to ask questions about your documents.
              </Typography>
            </View>
          ) : null
        }
      />
    </View>
  );
}
