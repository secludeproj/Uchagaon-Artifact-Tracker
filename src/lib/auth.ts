// ============================================================
// auth.ts — All authentication operations
// ============================================================

import { supabase } from './supabase';
import { upsertProfile, fetchProfile } from './db';

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // Read-only Drive access lets the Photo Import feature pull room
      // photos straight from each room's linked Drive folder. Google shows
      // the extra permission prompt once, the first time a given account
      // grants it — existing sessions need a fresh sign-in to pick it up.
      scopes: 'https://www.googleapis.com/auth/drive.readonly',
      queryParams: {
        access_type: 'offline',
      },
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function ensureProfile(userId: string, email: string, name: string) {
  const existing = await fetchProfile(userId);
  if (!existing) {
    await upsertProfile(userId, { name, email, role: 'STAFF' });
  } else {
    await upsertProfile(userId, { name: existing.name, email, role: existing.role });
  }
  return fetchProfile(userId);
}
