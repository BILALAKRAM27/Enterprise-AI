import { useState, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services/chat';
import { documentService } from '../../../services/document';
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
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => chatService.sendMessage(Number(id), text),
    onMutate: async (newText) => {
      setContent('');
      await queryClient.cancelQueries({ queryKey: ['messages', id] });
      const previousMessages = queryClient.getQueryData(['messages', id]);

      queryClient.setQueryData(['messages', id], (old: any) => [
        ...(old || []),
        { id: Date.now(), role: 'user', content: newText, created_at: new Date().toISOString() },
        { id: Date.now() + 1, role: 'assistant', content: '...', created_at: new Date().toISOString() }
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
      <View
        className={`mb-6 max-w-[85%] md:max-w-[75%] ${isUser ? 'self-end items-end' : 'self-start items-start'
          }`}
      >
        <View className={`flex-row items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Avatar branding layer (User/Ink vs Assistant/Signal) */}
          <View className={`rounded-full p-2.5 h-10 w-10 items-center justify-center shrink-0 ${isUser ? 'bg-[#EEF1FF] dark:bg-[#161B33]' : 'bg-[#E6FBF9] dark:bg-[#0E2624]'}`}>
            {isUser ? (
              <Feather name="user" size={16} color="#3652E3" />
            ) : (
              <Feather name={"sparkles" as any} size={16} className="text-[#0EA5A5] dark:text-[#2DD4C6]" />
            )}
          </View>

          <View className={`rounded-2xl px-4 py-3 shrink ${isUser ? 'bg-[#3652E3] rounded-tr-none' : 'bg-white border border-[#E4E4E7] rounded-tl-none dark:bg-[#27272A] dark:border-[#3F3F46]'}`}>
            <Typography variant="body" className={`leading-relaxed text-[15px] ${isUser ? 'text-[#FFFFFF]' : 'text-[#18181B] dark:text-[#FAFAFA]'}`}>
              {item.content}
            </Typography>

            {/* DESIGN.md Signature confidence-ribbon implementation */}
            {item.citations && item.citations.length > 0 && (
              <View className="mt-4 border-t border-[#E4E4E7] pt-3 dark:border-[#3F3F46] w-full">
                <Typography variant="caption" weight="semibold" className="mb-2 text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider text-[11px] font-mono">
                  Sources & Citations:
                </Typography>
                {item.citations.map((cite: any, i: number) => {
                  const rawScore = cite.score !== undefined && cite.score !== null ? cite.score : 85;
                  const confidence = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      onPress={() => documentService.openDocument(cite.document_id)}
                      className="relative overflow-hidden rounded-lg bg-zinc-50 border border-zinc-200 p-3 mb-2 dark:bg-[#1C1E23] dark:border-zinc-800 w-full"
                    >
                      {/* Ribbon Gradient Saturation Bar (Top Hairline) */}
                      <View className="absolute top-0 left-0 right-0 h-[3px] bg-[#0ea5a5] opacity-90" style={{ opacity: confidence / 100 }} />
                      <View className="flex-row justify-between items-center mb-1 w-full">
                        <Typography variant="caption" weight="bold" className="text-[#3652E3] dark:text-[#6E85FF] pr-2 flex-1 font-mono text-xs" numberOfLines={1}>
                          {cite.filename}
                        </Typography>
                        <Typography variant="caption" className="text-[#0EA5A5] dark:text-[#2DD4C6] font-mono text-[11px] shrink-0">
                          {confidence}% match
                        </Typography>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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
      className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Interactive sticky Top bar */}
      <View className="flex-row items-center border-b border-[#E4E4E7] bg-white px-4 py-3 pt-12 dark:border-[#3F3F46] dark:bg-[#0B0D12] h-16">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 min-w-[44px] min-h-[44px] justify-center items-center">
          <Feather name="arrow-left" size={20} className="text-[#18181B] dark:text-[#FAFAFA]" />
        </TouchableOpacity>
        <Typography variant="h3" weight="semibold" className="flex-1 text-[#18181B] dark:text-[#FAFAFA] tracking-tight" numberOfLines={1}>
          Chat Conversation
        </Typography>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        // Combined width: '100%' with maxWidth forces correct viewport alignment constraints 
        contentContainerStyle={{ padding: 16, paddingBottom: 24, maxWidth: 720, alignSelf: 'center', width: '100%' }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Styled Responsive footer chat inputs */}
      <View className="border-t border-[#E4E4E7] bg-white p-4 pb-8 dark:border-[#3F3F46] dark:bg-[#0B0D12]">
        <View className="mx-auto w-full max-w-[720px] flex-row items-center gap-3">
          <View className="flex-1">
            <Input
              placeholder="Ask anything about your documents..."
              value={content}
              onChangeText={setContent}
              className="bg-[#FFFFFF] dark:bg-[#1C1E23] border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-base px-4 h-12 text-[#18181B] dark:text-[#FAFAFA]"
              onSubmitEditing={handleSend}
            />
          </View>
          <Button
            size="icon"
            icon={<Feather name="send" size={18} color="#fff" />}
            onPress={handleSend}
            disabled={!content.trim() || sendMutation.isPending}
            className="h-12 w-12 rounded-full bg-[#3652E3] active:bg-[#2A3FB8] items-center justify-center shrink-0"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}