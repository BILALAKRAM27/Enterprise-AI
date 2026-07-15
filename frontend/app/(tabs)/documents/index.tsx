import { useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
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
      Alert.alert('Success', 'Document uploaded successfully');
    } catch (error) {
      Alert.alert('Upload Failed', 'There was an error uploading your document.');
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
            <Feather name="file-text" size={24} color="#6366f1" />
          </View>
          <View className="flex-1">
            <Typography variant="body" weight="medium" numberOfLines={1} className="mb-1">
              {item.filename}
            </Typography>
            <Typography variant="caption" color="muted">
              {format(new Date(item.uploaded_at), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </View>
        </View>
        <Button 
          variant="ghost" 
          size="icon" 
          icon={<Feather name="trash-2" size={20} color="#ef4444" />} 
          onPress={() => {
            Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) }
            ]);
          }}
        />
      </View>
      <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <Badge 
          label={item.status.toUpperCase()} 
          variant={item.status === 'ready' ? 'success' : item.status === 'failed' ? 'error' : 'warning'} 
        />
        <Typography variant="caption" color="muted" className="uppercase tracking-wider">
          {item.content_type || 'PDF'}
        </Typography>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-slate-50 p-4 pt-12 dark:bg-slate-900">
      <View className="mb-6 flex-row items-center justify-between">
        <Typography variant="h1" weight="bold">Documents</Typography>
        <Button 
          label="Upload" 
          icon={<Feather name="upload-cloud" size={18} color="#fff" />} 
          size="sm" 
          onPress={handleUpload}
          loading={uploading}
        />
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="mt-20 items-center justify-center">
              <View className="mb-4 rounded-full bg-slate-200 p-6 dark:bg-slate-800">
                <Feather name="file-text" size={48} color="#94a3b8" />
              </View>
              <Typography variant="h3" weight="semibold" className="mb-2">No documents yet</Typography>
              <Typography variant="body" color="muted" className="text-center">
                Upload your first document to start building your knowledge base.
              </Typography>
            </View>
          ) : null
        }
      />
    </View>
  );
}
