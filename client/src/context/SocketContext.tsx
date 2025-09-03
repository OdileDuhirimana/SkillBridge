import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SocketContextType, SendMessageData, ReactionData } from '../types';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: token
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  const joinChat = (chatId: string) => {
    if (socket) {
      socket.emit('join_chat', chatId);
    }
  };

  const leaveChat = (chatId: string) => {
    if (socket) {
      socket.emit('leave_chat', chatId);
    }
  };

  const sendMessage = (data: SendMessageData) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  };

  const startTyping = (chatId: string) => {
    if (socket) {
      socket.emit('typing_start', { chatId });
    }
  };

  const stopTyping = (chatId: string) => {
    if (socket) {
      socket.emit('typing_stop', { chatId });
    }
  };

  const addReaction = (data: ReactionData) => {
    if (socket) {
      socket.emit('add_reaction', data);
    }
  };

  const markMessagesRead = (chatId: string, messageIds: string[]) => {
    if (socket) {
      socket.emit('mark_messages_read', { chatId, messageIds });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    markMessagesRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
