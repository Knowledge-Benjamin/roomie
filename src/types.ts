export interface UserProfile {
  id: string;
  username: string;
  role: 'host' | 'user' | 'bot';
  gem_balance: number;
  earned_balance: number;
  ap: number;
  level: number;
  daily_streak: number;
  last_login: string;
  has_glowing_aura: boolean;
  avatar_url: string;
}

export interface TransactionLog {
  id: string;
  timestamp: string;
  sender_username: string;
  receiver_username: string;
  amount: number;
  type: 'room_entry' | 'gift' | 'escrow_payout' | 'escrow_rollback' | 'gems_purchase';
  description: string;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  category: string;
}

export interface RoomState {
  id: string;
  name: string;
  host_id: string;
  entry_fee: number;
  listener_count: number;
  escrow_pool: number;
  escrow_users: { user_id: string; fee_paid: number }[];
  participants: string[];
  seats: (string | null)[]; // mic stage slots 0 through 5 (0 is host, 1-5 represent audience seats)
  active_talking_seats: number[]; // indices of currently speaking users
  game_active: boolean;
  game_question_idx: number;
  game_questions: TriviaQuestion[];
  game_answers: Record<string, number>; // user_id -> optionIndex selected
  game_scores: Record<string, number>; // user_id -> total correct score
  game_status_text: string;
  chat_feed: {
    id: string;
    username: string;
    text: string;
    timestamp: string;
    type: 'chat' | 'system' | 'gift' | 'error' | 'entrance';
    badge?: string;
    glowing_aura?: boolean;
  }[];
  host_online: boolean;
  abandoned_timer_active: boolean;
  abandoned_time_remaining: number;
}
