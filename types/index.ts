export type UserRole = 'user' | 'leader' | 'admin';
export type MessageType = 'regular' | 'emergency_medical' | 'emergency_transport' | 'emergency_urgent';
export type MediaType = 'photo' | 'video' | 'audio' | 'document' | 'voice';
export type ReplyType = 'text' | 'audio';

export interface Group {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  telegram_id: string;
  name: string;
  city: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  onboarding_complete: boolean;
  created_at: string;
  groups?: Group[];
}

export interface Leader {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  user?: User;
  active_queue?: Queue;
}

export interface Queue {
  id: string;
  leader_id: string;
  is_open: boolean;
  message_limit: number;
  messages_received: number;
  opened_at?: string;
  leader?: Leader;
}

export interface Message {
  id: string;
  sender_id: string;
  leader_id: string;
  queue_id?: string;
  content?: string;
  message_type: MessageType;
  media_url?: string;
  media_type?: MediaType;
  is_emergency: boolean;
  is_replied: boolean;
  created_at: string;
  leader?: Leader;
  reply?: Reply;
}

export interface Reply {
  id: string;
  message_id: string;
  leader_id: string;
  content?: string;
  audio_url?: string;
  reply_type: ReplyType;
  created_at: string;
  leader?: Leader;
}

export interface Vachan {
  id: string;
  vachan_text: string;
  explanation_en: string;
  explanation_hi: string;
  category?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}
