import { apiService } from './api';
import { ApiResponse, Chat, Message, PaginationResponse } from '../types';

/**
 * Thin wrapper over the real `/api/chats` backend (server/routes/chats.js).
 * Replaces the hardcoded mock chat/message arrays previously used by
 * ChatPage. Real-time delivery still goes through SocketContext; this
 * service covers the initial REST load and the send-message fallback.
 */
export const chatService = {
  async getChats(page = 1, limit = 20): Promise<PaginationResponse<Chat>> {
    return apiService.get<PaginationResponse<Chat>>('/chats', { page, limit });
  },

  async getChat(id: string): Promise<Chat> {
    const response = await apiService.get<ApiResponse<Chat>>(`/chats/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load chat');
    }
    return response.data;
  },

  async sendMessage(chatId: string, content: string): Promise<Message> {
    const response = await apiService.post<ApiResponse<Message>>(`/chats/${chatId}/messages`, { content });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to send message');
    }
    return response.data;
  },

  async markAsRead(chatId: string): Promise<void> {
    const response = await apiService.put<ApiResponse<void>>(`/chats/${chatId}/read`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark chat as read');
    }
  }
};
