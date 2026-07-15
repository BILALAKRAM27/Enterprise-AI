export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface Document {
  id: number;
  filename: string;
  content_type: string;
  status: 'processing' | 'ready' | 'failed';
  uploaded_at: string;
}

export interface Chat {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  id: number;
  document_id: number;
  filename: string;
  text_content?: string;
  score: number;
}

export interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
