export interface Member {
  id: string;
  name: string;
  pin_hash: string;
  color: string;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  storage_path: string;
  duration: number | null;
  week_number: number;
  uploaded_by: string;
  created_at: string;
  // Joined fields
  member?: Pick<Member, "id" | "name" | "color">;
  comment_count?: number;
  audio_url?: string;
}

export interface Comment {
  id: string;
  song_id: string;
  member_id: string;
  time_start: number | null;
  time_end: number | null;
  parent_id: string | null;
  content: string;
  created_at: string;
  // Joined fields
  member?: Pick<Member, "id" | "name" | "color">;
  replies?: Comment[];
}

export interface Session {
  id: string;
  member_id: string;
  token: string;
  expires_at: string;
}

export interface JWTPayload {
  sub: string; // member_id
  name: string;
  iat: number;
  exp: number;
}

