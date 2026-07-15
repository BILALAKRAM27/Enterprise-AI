import { useState } from 'react';
import { View, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { documentService } from '../../../services/document';
import { Typography } from '../../../components/Typography';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function DocumentsScreen() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['documents'],
    queryFn: documentService.getDocuments,
  });

  const deleteMutation = useMutation({
    mutationFn: documentService.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    onError: () => Alert.alert('Error', 'Failed to delete document'),
  });

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      await documentService.uploadDocument(file.uri, file.name, file.mimeType || 'application/octet-stream');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error) {
      Alert.alert('Upload Failed', 'There was an error uploading your document.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIconColors = (type?: string) => {
    const norm = (type || '').toLowerCase();
    if (norm.includes('pdf')) return { bg: 'bg-[#FCEBEB] dark:bg-[#301213]', color: '#C2281F' };
    if (norm.includes('word') || norm.includes('docx') || norm.includes('msword')) return { bg: 'bg-[#EAF1FE] dark:bg-[#111E33]', color: '#2563EB' };
    return { bg: 'bg-zinc-100 dark:bg-zinc-800', color: '#71717A' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const themeSpec = getFileIconColors(item.content_type || item.filename);

    return (
      <Card className="mb-3 border border-[#E4E4E7] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <View className={`rounded-xl p-3 ${themeSpec.bg}`}>
              <Feather name="file-text" size={20} color={themeSpec.color} />
            </View>
            <View className="flex-1">
              <Typography variant="body" weight="medium" numberOfLines={1} className="text-[#18181B] dark:text-[#FAFAFA]">
                {item.filename}
              </Typography>
              <Typography variant="caption" color="muted" className="font-mono text-xs mt-0.5">
                {format(new Date(item.uploaded_at), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            className="h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onPress={() => {
              Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) }
              ]);
            }}
          >
            <Feather name="trash-2" size={18} color="#C2281F" />
          </TouchableOpacity>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-[#E4E4E7] pt-3 dark:border-[#3F3F46]">
          <Badge
            label={item.status.toUpperCase()}
            variant={item.status === 'ready' ? 'success' : item.status === 'failed' ? 'error' : 'warning'}
          />
          <Typography variant="caption" className="uppercase font-mono text-[10px] tracking-widest text-[#71717A] dark:text-[#A1A1AA]">
            {item.content_type?.split('/')?.[1] || 'DOC'}
          </Typography>
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]">
      <View className="mx-auto w-full max-w-[1120px] flex-1 px-6 pb-6 pt-16 md:px-8">
        <View className="mb-6 flex-row items-center justify-between">
          <Typography variant="h1" weight="bold" className="text-[#18181B] dark:text-[#FAFAFA] tracking-tight">
            Documents
          </Typography>
          <Button
            label="Upload"
            icon={<Feather name="upload-cloud" size={16} color="#fff" />}
            size="sm"
            onPress={handleUpload}
            loading={uploading}
            className="bg-[#3652E3] active:bg-[#2A3FB8] h-10 px-4 rounded-xl"
          />
        </View>

        <FlatList
          data={documents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3652E3" />}
          ListEmptyComponent={
            !isLoading ? (
              <View className="mt-20 items-center justify-center px-4">
                <View className="mb-4 rounded-full bg-zinc-100 p-6 dark:bg-zinc-800">
                  <Feather name="file-text" size={40} color="#A1A1AA" />
                </View>
                <Typography variant="h3" weight="semibold" className="mb-2 text-[#18181B] dark:text-[#FAFAFA]">
                  No documents yet
                </Typography>
                <Typography variant="body" color="muted" className="text-center max-w-[280px] mb-6">
                  Upload your first document to start building your knowledge base.
                </Typography>
                <Button
                  label="Upload your first document"
                  onPress={handleUpload}
                  className="bg-[#3652E3] px-6"
                />
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}