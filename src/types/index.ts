// ============================================================
// MESSENGER APP - TYPE DEFINITIONS
// ============================================================

export type Role = 'user' | 'leader' | 'admin';
export type Language = 'en' | 'hi';
export type Theme = 'dark' | 'light';
export type MessageType = 'general' | 'question' | 'suggestion' | 'emergency_medical' | 'emergency_transport' | 'emergency_urgent';
export type MediaType = 'photo' | 'video' | 'audio' | 'document' | 'voice';
export type ReplyType = 'text' | 'audio';
export type NotificationType = 'queue_opened' | 'reply_received' | 'emergency_ack';

export interface Group {
  id: string;
  name: string;
  telegram_group_id: string | null;
  telegram_group_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  name: string;
  phone: string | null;
  city: string;
  role: Role;
  is_active: boolean;
  language: Language;
  theme: Theme;
  emergency_count_today: number;
  emergency_reset_date: string;
  created_at: string;
  updated_at: string;
  groups?: Group[];
}

export interface Leader {
  id: string;
  user_id: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  user?: User;
  active_queue?: Queue | null;
}

export interface Queue {
  id: string;
  leader_id: string;
  is_open: boolean;
  message_limit: number;
  messages_received: number;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  leader?: Leader;
}

export interface Message {
  id: string;
  user_id: string;
  leader_id: string;
  queue_id: string | null;
  content: string;
  message_type: MessageType;
  is_emergency: boolean;
  media_url: string | null;
  media_type: MediaType | null;
  is_replied: boolean;
  created_at: string;
  user?: User;
  leader?: Leader;
  reply?: Reply | null;
}

export interface Reply {
  id: string;
  message_id: string;
  leader_id: string;
  content: string | null;
  reply_type: ReplyType;
  audio_url: string | null;
  created_at: string;
  leader?: Leader;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface Vachan {
  id: string;
  content_en: string;
  content_hi: string;
  explanation_en: string;
  explanation_hi: string;
  is_active: boolean;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    hash: string;
    auth_date: number;
  };
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
  };
}

// Auth context
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

// Leader stats
export interface LeaderStats {
  total_messages: number;
  pending_messages: number;
  emergency_messages: number;
  replies_today: number;
  messages_today: number;
  avg_response_time_hours: number;
}
