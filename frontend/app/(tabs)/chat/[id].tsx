import { useState, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services/chat';
import { Typography } from '../../../components/Typography';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Feather } from '@expo/vector-icons';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => chatService.getMessages(Number(id)),
    refetchInterval: 5000, // simple polling for demo if streaming isn't implemented
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => chatService.sendMessage(Number(id), text),
    onMutate: async (newText) => {
      setContent('');
      await queryClient.cancelQueries({ queryKey: ['messages', id] });
      const previousMessages = queryClient.getQueryData(['messages', id]);
      
      // Optimistic update
      queryClient.setQueryData(['messages', id], (old: any) => [
        ...(old || []),
        { id: Date.now(), role: 'user', content: newText, created_at: new Date().toISOString() },
        { id: Date.now() + 1, role: 'assistant', content: '...', created_at: new Date().toISOString() } // loading stub
      ]);
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return { previousMessages };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
    onError: (err, newText, context) => {
      queryClient.setQueryData(['messages', id], context?.previousMessages);
    },
  });

  const handleSend = () => {
    if (!content.trim()) return;
    sendMutation.mutate(content);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
        <View className={`flex-row items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <View className={`rounded-full p-2 ${isUser ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
            {isUser ? <Feather name="user" size={16} color="#4f46e5" /> : <Feather name="cpu" size={16} color="#059669" />}
          </View>
          <View className={`rounded-2xl px-4 py-3 ${isUser ? 'bg-indigo-600 rounded-br-sm' : 'bg-white border border-slate-200 rounded-bl-sm dark:bg-slate-800 dark:border-slate-700'}`}>
            <Typography variant="body" className={isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'}>
              {item.content}
            </Typography>
            
            {/* Citations block */}
            {item.citations && item.citations.length > 0 && (
              <View className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                <Typography variant="caption" weight="semibold" className="mb-1 text-slate-500">Sources:</Typography>
                {item.citations.map((cite: any, i: number) => (
                  <View key={i} className="bg-slate-50 p-2 rounded mb-1 dark:bg-slate-900/50">
                    <Typography variant="caption" weight="bold" className="text-indigo-600 dark:text-indigo-400">
                      {cite.filename}
                    </Typography>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View className="flex-row items-center border-b border-slate-200 bg-white p-4 pt-12 dark:border-slate-800 dark:bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2">
          <Feather name="arrow-left" size={24} className="text-slate-900 dark:text-white" />
        </TouchableOpacity>
        <Typography variant="h3" weight="semibold" className="flex-1" numberOfLines={1}>
          Chat
        </Typography>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View className="border-t border-slate-200 bg-white p-4 pb-8 dark:border-slate-800 dark:bg-slate-900 flex-row items-center gap-3">
        <View className="flex-1">
          <Input 
            placeholder="Type your message..." 
            value={content}
            onChangeText={setContent}
            className="mb-0 h-12"
            onSubmitEditing={handleSend}
          />
        </View>
        <Button 
          size="icon" 
          icon={<Feather name="send" size={20} color="#fff" />} 
          onPress={handleSend}
          disabled={!content.trim() || sendMutation.isPending}
          className="h-12 w-12 rounded-full mb-4"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
