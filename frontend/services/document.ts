import { Platform } from 'react-native';
import { api } from './api';
import { Document } from '../types';

export const documentService = {
  getDocuments: async (): Promise<Document[]> => {
    const { data } = await api.get<Document[]>('/documents/');
    return data;
  },

  uploadDocument: async (fileUri: string, fileName: string, mimeType: string): Promise<Document> => {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append('file', blob, fileName);
    } else {
      // @ts-ignore - React Native FormData accepts an object with uri, name, type
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      });
    }

    const { data } = await api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteDocument: async (documentId: number): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  }
};

