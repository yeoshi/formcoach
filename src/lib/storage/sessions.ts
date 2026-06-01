import type { Session } from "@/lib/types";

const STORAGE_KEY = "formcoach_sessions";

export function saveSession(session: Session): void {
  try {
    const sessions = getAllSessions();
    sessions.unshift(session);
    if (sessions.length > 20) sessions.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    const sessions = getAllSessions();
    if (sessions.length > 0) {
      sessions.pop();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      saveSession(session);
    }
  }
}

export function getAllSessions(): Session[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getSession(id: string): Session | null {
  return getAllSessions().find((s) => s.id === id) ?? null;
}

export function updateSession(session: Session): void {
  const sessions = getAllSessions().map((s) =>
    s.id === session.id ? session : s
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getAllSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
