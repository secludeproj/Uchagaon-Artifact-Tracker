import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cikakrozzeyetmbqwupu.supabase.co';
const supabaseAnonKey = 'sb_publishable_zSz7wTQtFCe1aPyFU0qlUQ_yoGAsMVh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Database Types ────────────────────────────────────────────────────────────

export interface DbArtifact {
  id: string;
  qr_code: string;
  name: string;
  category: string;
  sub_category: string | null;
  description: string;
  estimated_age: string;
  material: string;
  dimensions: string;
  quantity: number;
  condition: string;
  estimated_value: number | null;
  original_location: string;
  current_location: string;
  status: string;
  photos: string[];
  handling_notes: string;
  conservation_notes: string;
  drive_link: string | null;
  last_inspected_date: string | null;
  story: string;
  added_by: string;
  added_by_email: string;
  last_updated_by: string;
  last_updated_by_email: string;
  added_date: string;
  last_updated_date: string;
  pending_sync: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMovementLog {
  id: string;
  artifact_id: string;
  date: string;
  old_location: string;
  new_location: string;
  old_status: string | null;
  new_status: string | null;
  note: string;
  staff_member: string;
  staff_email: string;
  created_at: string;
}

export interface DbInspectionLog {
  id: string;
  artifact_id: string;
  date: string;
  inspector: string;
  inspector_email: string;
  notes: string;
  photo_url: string;
  condition: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  joined_date: string;
  last_active: string;
}

export interface DbTeamActivity {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  action: string;
  artifact_name: string;
  artifact_id: string;
  details: string;
  timestamp: string;
}
