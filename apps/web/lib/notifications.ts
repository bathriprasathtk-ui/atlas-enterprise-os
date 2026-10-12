/* =========================================================
   NOTIFICATIONS (client data layer)

   Owner-only via RLS (user_id = auth.uid()) plus explicit
   user scoping on every query.
========================================================= */

import { supabase } from "./supabaseClient.ts";

export type NotificationType =
  | "system"
  | "task"
  | "workflow"
  | "document"
  | "ai";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getNotifications(
  limit = 20
): Promise<AppNotification[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function markNotificationRead(
  id: string
): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
}


/* =========================================================
   NOTIFICATION BADGE PREFERENCE (browser-local)

   Persisted in localStorage and exposed through
   useSyncExternalStore so the Settings toggle and the
   top-bar badge stay in sync across the whole app.
========================================================= */

const BADGE_PREF_KEY = "atlas.notifications.enabled";

function readBadgePref(): boolean {
  const stored = window.localStorage.getItem(BADGE_PREF_KEY);

  return stored === null ? true : stored === "true";
}

export function subscribeToBadgePref(
  callback: () => void
): () => void {
  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener("atlas:settings-changed", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("atlas:settings-changed", handler);
  };
}

export function getBadgePrefSnapshot(): boolean {
  return readBadgePref();
}

/** SSR must assume the default (enabled) value. */
export function getBadgePrefServerSnapshot(): boolean {
  return true;
}

export function setBadgePref(enabled: boolean): void {
  window.localStorage.setItem(BADGE_PREF_KEY, String(enabled));
  window.dispatchEvent(new Event("atlas:settings-changed"));
}
