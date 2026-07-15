import { View, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Typography } from '../../components/Typography';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAppSelector } from '../../hooks/store';
import { documentService } from '../../services/document';
import { chatService } from '../../services/chat';
import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

export default function DashboardScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: documentService.getDocuments,
  });

  const { data: chats, refetch: refetchChats } = useQuery({
    queryKey: ['chats'],
    queryFn: chatService.getChats,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDocs(), refetchChats()]);
    setRefreshing(false);
  }, [refetchDocs, refetchChats]);

  const processingDocs = documents?.filter(d => d.status === 'processing').length || 0;
  const readyDocs = documents?.filter(d => d.status === 'ready').length || 0;

  return (
    <ScrollView
      className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3652E3"
          colors={["#3652E3"]}
        />
      }
    >
      <View className="mx-auto w-full max-w-[1120px] px-6 pb-12 pt-16 md:px-8">
        {/* Header Section */}
        <View className="mb-8 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Typography variant="h1" weight="bold" className="text-[#18181B] dark:text-[#FAFAFA] tracking-tight">
              Welcome back
            </Typography>
            <Typography variant="body" color="muted" className="mt-1 font-mono text-xs tracking-wide">
              {user?.email}
            </Typography>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
            className="h-11 w-11 items-center justify-center rounded-full bg-[#EEF1FF] border border-[#E4E4E7] dark:bg-[#161B33] dark:border-[#3F3F46]"
          >
            <Feather name="user" size={18} color="#3652E3" />
          </TouchableOpacity>
        </View>

        {/* AI Suggestion Card (Signal / Teal Spec) */}
        <View className="mb-8 overflow-hidden rounded-2xl bg-[#E6FBF9] border border-[#B9EFEA] p-5 dark:bg-[#0E2624] dark:border-[#1B4C48]">
          <View className="flex-row items-start gap-3">
            <View className="rounded-lg bg-[#0EA5A5]/10 p-2 dark:bg-[#2DD4C6]/10">
              <Feather name={"sparkles" as any} size={18} className="text-[#0EA5A5] dark:text-[#2DD4C6]" />
            </View>
            <View className="flex-1">
              <Typography variant="body" weight="semibold" className="text-[#0B8383] dark:text-[#5CE8DB]">
                AI Suggested Action
              </Typography>
              <Typography variant="caption" className="mt-1 text-[#0ea5a5] dark:text-[#2dd4c6]/80 leading-relaxed">
                {documents && documents.length > 0
                  ? `You have ${documents.length} indexed documents. Start a chat session to synthesize insights instantly.`
                  : "Upload your first PDF or TXT files to establish your workspace's baseline AI knowledge structure."
                }
              </Typography>
            </View>
          </View>
        </View>

        {/* Statistics Grid */}
        <View className="mb-8 flex-row flex-wrap gap-4 md:flex-nowrap">
          <Card className="flex-1 min-w-[140px] border border-[#E4E4E7] bg-white p-5 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl">
            <View className="mb-3 flex-row items-center justify-between">
              <Typography variant="label" color="muted" className="text-xs uppercase tracking-wider font-semibold">Documents</Typography>
              <View className="rounded-lg bg-[#EEF1FF] p-2 dark:bg-[#161B33]">
                <Feather name="file-text" size={16} color="#3652E3" />
              </View>
            </View>
            <Typography variant="h2" weight="bold" className="text-[#18181B] dark:text-[#FAFAFA] font-display text-3xl">
              {documents?.length || 0}
            </Typography>
            <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <View className="flex-row items-center gap-1">
                <View className="h-1.5 w-1.5 rounded-full bg-[#1B8A3D] dark:bg-[#4ADE80]" />
                <Typography variant="caption" className="text-[#1B8A3D] dark:text-[#4ADE80] font-mono text-[11px]">{readyDocs} ready</Typography>
              </View>
              {processingDocs > 0 && (
                <View className="flex-row items-center gap-1">
                  <View className="h-1.5 w-1.5 rounded-full bg-[#B4690E] dark:bg-[#F5A623]" />
                  <Typography variant="caption" className="text-[#B4690E] dark:text-[#F5A623] font-mono text-[11px]">{processingDocs} processing</Typography>
                </View>
              )}
            </View>
          </Card>

          <Card className="flex-1 min-w-[140px] border border-[#E4E4E7] bg-white p-5 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl">
            <View className="mb-3 flex-row items-center justify-between">
              <Typography variant="label" color="muted" className="text-xs uppercase tracking-wider font-semibold">Conversations</Typography>
              <View className="rounded-lg bg-[#EEF1FF] p-2 dark:bg-[#161B33]">
                <Feather name="message-square" size={16} color="#3652E3" />
              </View>
            </View>
            <Typography variant="h2" weight="bold" className="text-[#18181B] dark:text-[#FAFAFA] font-display text-3xl">
              {chats?.length || 0}
            </Typography>
            <Typography variant="caption" color="muted" className="mt-3 font-mono text-[11px]">Active workspaces</Typography>
          </Card>
        </View>

        {/* Quick Actions Container */}
        <Typography variant="h3" weight="semibold" className="mb-4 text-[#18181B] dark:text-[#FAFAFA] tracking-tight">
          Quick Actions
        </Typography>
        <View className="flex-col gap-3 md:flex-row">
          <View className="flex-1">
            <Button
              label="Upload Document"
              icon={<Feather name="upload" size={18} color="#fff" />}
              onPress={() => router.push('/(tabs)/documents')}
              size="lg"
              className="bg-[#3652E3] active:bg-[#2A3FB8] dark:bg-[#6E85FF] dark:active:bg-[#8C9AFF] h-12 rounded-xl"
            />
          </View>
          <View className="flex-1">
            <Button
              label="New Conversation"
              variant="outline"
              icon={<Feather name="plus" size={18} color="#3652E3" />}
              onPress={() => router.push('/(tabs)/chat' as any)}
              size="lg"
              className="border-[#3652E3] text-[#3652E3] dark:border-[#6E85FF] dark:text-[#6E85FF] h-12 rounded-xl"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}