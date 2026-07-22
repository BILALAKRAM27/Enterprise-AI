import { useState } from 'react';
import { View, FlatList, RefreshControl, Alert, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { documentService } from '../../../services/document';
import { Typography } from '../../../components/Typography';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

interface UploadState {
  id: string;
  filename: string;
  size?: string;
  progress: number;
  status: 'uploading' | 'processing' | 'success' | 'failed';
  error?: string;
  uri: string;
  mimeType: string;
  cancelSource?: any;
}

export default function DocumentsScreen() {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [retryingIds, setRetryingIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Deletion Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  // Hover & Focus states for Web delete button
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Poll only when there are processing documents or active uploads in processing state
  const { data: documents, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['documents'],
    queryFn: documentService.getDocuments,
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      const hasProcessing = data?.some((d: any) => d.status === 'processing') || uploads.some(u => u.status === 'processing');
      return hasProcessing ? 2000 : false;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: documentService.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Document deleted successfully');
    },
    onError: () => {
      showToast('Failed to delete document', 'error');
    },
    onSettled: () => {
      setDeletingDocId(null);
      setDeleteModalVisible(false);
    }
  });

  const triggerSingleUpload = async (u: { id: string; filename: string; uri: string; mimeType: string }) => {
    const cancelSource = axios.CancelToken.source();

    setUploads((prev) =>
      prev.map((item) =>
        item.id === u.id
          ? { ...item, cancelSource, status: 'uploading', progress: 0, error: undefined }
          : item
      )
    );

    try {
      await documentService.uploadDocument(
        u.uri,
        u.filename,
        u.mimeType,
        (progress) => {
          setUploads((prev) =>
            prev.map((item) => (item.id === u.id ? { ...item, progress } : item))
          );
        },
        cancelSource.token
      );

      setUploads((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, status: 'processing', progress: 100 } : item))
      );

      queryClient.invalidateQueries({ queryKey: ['documents'] });

      setTimeout(() => {
        setUploads((prev) => prev.filter((item) => item.id !== u.id));
      }, 3000);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        setUploads((prev) => prev.filter((item) => item.id !== u.id));
      } else {
        setUploads((prev) =>
          prev.map((item) =>
            item.id === u.id
              ? { ...item, status: 'failed', error: error.response?.data?.detail || 'Upload failed' }
              : item
          )
        );
      }
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/msword',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      const newUploads = result.assets.map((asset) => {
        const sizeMb = asset.size ? (asset.size / (1024 * 1024)).toFixed(2) : undefined;
        const uploadId = Math.random().toString(36).substring(7);
        return {
          id: uploadId,
          filename: asset.name,
          size: sizeMb ? `${sizeMb} MB` : undefined,
          progress: 0,
          status: 'uploading' as const,
          uri: asset.uri,
          mimeType: asset.mimeType || 'application/octet-stream',
        };
      });

      setUploads((prev) => [...newUploads, ...prev]);

      newUploads.forEach((u) => {
        triggerSingleUpload(u);
      });
    } catch (error) {
      showToast('There was an error selecting files.', 'error');
    }
  };

  const handleRetry = async (docId: number) => {
    setRetryingIds((prev) => [...prev, docId]);

    // Optimistically update document status in react-query cache to show PROCESSING
    queryClient.setQueryData(['documents'], (oldDocs: any) =>
      oldDocs ? oldDocs.map((d: any) => (d.id === docId ? { ...d, status: 'processing' } : d)) : []
    );

    try {
      await documentService.retryDocument(docId);
      await refetch();
    } catch (err) {
      showToast('Could not re-trigger ingestion pipeline.', 'error');
      // Revert cache on failure
      queryClient.setQueryData(['documents'], (oldDocs: any) =>
        oldDocs ? oldDocs.map((d: any) => (d.id === docId ? { ...d, status: 'failed' } : d)) : []
      );
    } finally {
      setRetryingIds((prev) => prev.filter((id) => id !== docId));
    }
  };

  const getFileIconColors = (type?: string) => {
    const norm = (type || '').toLowerCase();
    if (norm.includes('pdf')) return { bg: 'bg-[#FCEBEB] dark:bg-[#301213]', color: '#C2281F' };
    if (norm.includes('word') || norm.includes('docx') || norm.includes('msword')) return { bg: 'bg-[#EAF1FE] dark:bg-[#111E33]', color: '#2563EB' };
    return { bg: 'bg-zinc-100 dark:bg-zinc-800', color: '#71717A' };
  };

  const renderUploadCard = (u: UploadState) => (
    <Card key={u.id} className="border border-[#E4E4E7] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#27272A] rounded-2xl mb-3 shadow-xs">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <View className="rounded-xl p-3 bg-zinc-100 dark:bg-zinc-800">
            <Feather name="file-text" size={20} color="#71717A" />
          </View>
          <View className="flex-1">
            <Typography variant="body" weight="medium" numberOfLines={1} className="text-[#18181B] dark:text-[#FAFAFA]">
              {u.filename}
            </Typography>
            {u.size && (
              <Typography variant="caption" color="muted" className="font-mono text-xs mt-0.5">
                {u.size}
              </Typography>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {u.status === 'uploading' && (
            <TouchableOpacity
              onPress={() => u.cancelSource?.cancel('User canceled upload')}
              className="h-8 px-3 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 min-w-[60px]"
            >
              <Typography variant="caption" className="text-[#C2281F]">Cancel</Typography>
            </TouchableOpacity>
          )}
          {u.status === 'failed' && (
            <>
              <TouchableOpacity
                onPress={() => triggerSingleUpload(u)}
                className="h-8 px-3 items-center justify-center rounded-lg bg-[#3652E3]"
              >
                <Typography variant="caption" className="text-white">Retry</Typography>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUploads((prev) => prev.filter((item) => item.id !== u.id))}
                className="h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
              >
                <Feather name="x" size={16} color="#71717A" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View className="mt-2">
        {u.status === 'uploading' && (
          <View>
            <View className="flex-row justify-between mb-1">
              <Typography variant="caption" color="muted">Uploading...</Typography>
              <Typography variant="caption" className="font-mono">{u.progress}%</Typography>
            </View>
            <View className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <View className="h-full bg-[#3652E3]" style={{ width: `${u.progress}%` }} />
            </View>
          </View>
        )}

        {u.status === 'processing' && (
          <View>
            <View className="flex-row justify-between mb-1">
              <Typography variant="caption" className="text-[#0EA5A5] dark:text-[#2DD4C6] font-medium">Extracting & Indexing...</Typography>
              <Typography variant="caption" className="font-mono">100%</Typography>
            </View>
            <View className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <View className="h-full bg-[#0EA5A5]" style={{ width: '100%' }} />
            </View>
          </View>
        )}

        {u.status === 'failed' && (
          <View className="bg-[#FCEBEB] dark:bg-[#301213] rounded-xl p-2 mt-1 border border-[#F87171]/30">
            <Typography variant="caption" className="text-[#C2281F] dark:text-[#F87171]">
              Error: {u.error || 'Failed to upload'}
            </Typography>
          </View>
        )}
      </View>
    </Card>
  );

  const renderItem = ({ item }: { item: any }) => {
    const themeSpec = getFileIconColors(item.content_type || item.filename);
    const isRetrying = retryingIds.includes(item.id);
    const isHovered = hoveredCardId === item.id;
    const isFocused = focusedCardId === item.id;

    // Show delete button always on mobile, and on hover/focus on web
    const showDeleteButton = Platform.OS !== 'web' || isHovered || isFocused;

    return (
      <View
        // @ts-ignore
        onMouseEnter={() => setHoveredCardId(item.id)}
        // @ts-ignore
        onMouseLeave={() => setHoveredCardId(null)}
        className="mb-3"
      >
        <Card className={`border ${item.status === 'failed' ? 'border-[#F87171] bg-[#FCEBEB]/20 dark:bg-[#301213]/10 dark:border-[#301213]' : 'border-[#E4E4E7] bg-white dark:border-[#3F3F46] dark:bg-[#27272A]'} p-4 rounded-2xl relative shadow-xs`}>
          <View className="flex-row items-start justify-between">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (item.status === 'ready') {
                  documentService.openDocument(item.id);
                }
              }}
              disabled={item.status !== 'ready'}
              // @ts-ignore
              onFocus={() => setFocusedCardId(item.id)}
              // @ts-ignore
              onBlur={() => setFocusedCardId(null)}
              className="flex-1 flex-row items-center gap-3 mr-2"
            >
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
            </TouchableOpacity>

            {showDeleteButton && (
              <TouchableOpacity
                activeOpacity={0.7}
                className="h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:opacity-100"
                onPress={() => {
                  setDeletingDocId(item.id);
                  setDeleteModalVisible(true);
                }}
              >
                <Feather name="trash-2" size={18} color="#C2281F" />
              </TouchableOpacity>
            )}
          </View>

          {item.status === 'failed' && (
            <View className="mt-4 bg-[#FCEBEB] dark:bg-[#301213] rounded-xl p-3 border border-[#F87171]/30">
              <View className="flex-row items-center gap-2 mb-2">
                <Feather name="alert-triangle" size={16} color="#C2281F" />
                <Typography variant="caption" weight="bold" className="text-[#C2281F] dark:text-[#F87171]">
                  Ingestion Failed
                </Typography>
              </View>
              <Typography variant="body" className="text-[#C2281F] dark:text-[#F87171] text-xs mb-3">
                There was an error parsing or generating embeddings for this document. Please try again.
              </Typography>
              <Button
                label={isRetrying ? "Retrying..." : "Try Again"}
                onPress={() => handleRetry(item.id)}
                loading={isRetrying}
                disabled={isRetrying}
                size="sm"
                className="bg-[#C2281F] active:bg-[#301213] rounded-xl h-8 px-4 self-start"
              />
            </View>
          )}

          {item.status !== 'failed' && (
            <View className="mt-4 flex-row items-center justify-between border-t border-[#E4E4E7] pt-3 dark:border-[#3F3F46]">
              <Badge
                label={item.status.toUpperCase()}
                variant={item.status === 'ready' ? 'success' : 'warning'}
              />
              <Typography variant="caption" className="uppercase font-mono text-[10px] tracking-widest text-[#71717A] dark:text-[#A1A1AA]">
                {item.content_type?.split('/')?.[1] || 'DOC'}
              </Typography>
            </View>
          )}
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
        <View className="mb-6 flex-row items-center justify-between">
          <Typography variant="h1" weight="bold" className="text-[#18181B] dark:text-[#FAFAFA] tracking-tight">
            Documents
          </Typography>
          <Button
            label="Upload"
            icon={<Feather name="upload-cloud" size={16} color="#fff" />}
            size="sm"
            onPress={handleUpload}
            className="bg-[#3652E3] active:bg-[#2A3FB8] h-10 px-4 rounded-xl"
          />
        </View>

        {/* Stack Active Upload Cards */}
        {uploads.length > 0 && (
          <View className="mb-6">
            <Typography variant="h3" weight="semibold" className="text-[#18181B] dark:text-[#FAFAFA] tracking-tight mb-3">
              Active Uploads
            </Typography>
            {uploads.map(renderUploadCard)}
          </View>
        )}

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

      <ConfirmModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          if (deletingDocId !== null) {
            deleteMutation.mutate(deletingDocId);
          }
        }}
        title="Delete Document"
        description="Are you sure you want to delete this document? This will remove all PostgreSQL metadata, chunks, and Qdrant vector embeddings. This action cannot be undone."
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