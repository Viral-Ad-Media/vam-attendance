// lib/supabase/auth.ts
import { getBrowserSupabase } from "./client";
import { getServerSupabase } from "./server";

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, userData?: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData || {},
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  const supabase = await getBrowserSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = await getBrowserSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) throw error;
}

/**
 * Server-side: Get current user (use in server components)
 */
export async function getServerCurrentUser() {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Server-side: Get current session (use in server components)
 */
export async function getServerSession() {
  const supabase = getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
