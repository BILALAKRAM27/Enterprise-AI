import { Platform } from 'react-native';
import { api, BASE_URL } from './api';
import { Document } from '../types';
import { storage } from '../utils/storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export const documentService = {
  getDocuments: async (): Promise<Document[]> => {
    const { data } = await api.get<Document[]>('/documents/');
    return data;
  },

  uploadDocument: async (
    fileUri: string, 
    fileName: string, 
    mimeType: string,
    onProgress?: (progress: number) => void,
    cancelToken?: any
  ): Promise<Document> => {
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
      cancelToken,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    return data;
  },

  deleteDocument: async (documentId: number): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  },

  retryDocument: async (documentId: number): Promise<Document> => {
    const { data } = await api.post<Document>(`/documents/${documentId}/retry`);
    return data;
  },

  openDocument: async (documentId: number): Promise<void> => {
    const token = await storage.getItemAsync('access_token');
    const url = `${BASE_URL}/documents/${documentId}/download?token=${token}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (err) {
        // Fallback to Linking if WebBrowser fails
        await Linking.openURL(url);
      }
    }
  }
};

