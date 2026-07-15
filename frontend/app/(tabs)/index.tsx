import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Typography } from '../../components/Typography';
import { Card, CardHeader } from '../../components/Card';
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
  }, []);

  const processingDocs = documents?.filter(d => d.status === 'processing').length || 0;
  const readyDocs = documents?.filter(d => d.status === 'ready').length || 0;

  return (
    <ScrollView 
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-6 pt-12">
        <Typography variant="h1" weight="bold" className="mb-2 text-slate-900 dark:text-white">
          Welcome back
        </Typography>
        <Typography variant="body" color="muted" className="mb-8">
          {user?.email}
        </Typography>

        <View className="mb-8 flex-row flex-wrap justify-between">
          <Card className="w-[48%] mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Typography variant="label" color="muted">Total Documents</Typography>
              <Feather name="file-text" size={16} color="#6366f1" />
            </View>
            <Typography variant="h2" weight="bold">{documents?.length || 0}</Typography>
            <View className="mt-2 flex-row space-x-2 gap-2">
              <Typography variant="caption" color="success">{readyDocs} ready</Typography>
              {processingDocs > 0 && <Typography variant="caption" color="warning">{processingDocs} processing</Typography>}
            </View>
          </Card>

          <Card className="w-[48%] mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Typography variant="label" color="muted">Total Chats</Typography>
              <Feather name="message-square" size={16} color="#6366f1" />
            </View>
            <Typography variant="h2" weight="bold">{chats?.length || 0}</Typography>
          </Card>
        </View>

        <Typography variant="h3" weight="semibold" className="mb-4">Quick Actions</Typography>
        <View className="space-y-4 gap-4">
          <Button 
            label="Upload Document" 
            icon={<Feather name="upload" size={20} color="#fff" />}
            onPress={() => router.push('/(tabs)/documents')}
            size="lg"
          />
          <Button 
            label="New Chat" 
            variant="outline"
            icon={<Feather name="plus" size={20} color="#6366f1" />}
            onPress={() => router.push('/(tabs)/chat' as any)}
            size="lg"
          />
        </View>
      </View>
    </ScrollView>
  );
}
