import { api } from './api';
import { Chat, Message } from '../types';

export const chatService = {
  getChats: async (): Promise<Chat[]> => {
    const { data } = await api.get<Chat[]>('/chat/history');
    return data;
  },

  createChat: async (title: string): Promise<Chat> => {
    const { data } = await api.post<Chat>('/chat/', { title });
    return data;
  },

  getMessages: async (chatId: number): Promise<Message[]> => {
    const { data } = await api.get<Message[]>(`/chat/${chatId}/messages`);
    return data;
  },

  sendMessage: async (chatId: number, content: string): Promise<Message> => {
    const { data } = await api.post<Message>(`/chat/${chatId}/completions`, { content });
    return data;
  },

  deleteChat: async (chatId: number): Promise<void> => {
    await api.delete(`/chat/${chatId}`);
  }
};
