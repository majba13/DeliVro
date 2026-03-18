"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  channel: string;
  createdAt: string;
}

interface NotificationResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

function timeAgo(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function NotificationBell() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function fetchNotifications(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<NotificationResponse>("/api/notifications?limit=12");
      setNotifications(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      if (!silent) toast("Failed to load notifications", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications(true);
    const id = setInterval(() => {
      // Polling gives near real-time UX without requiring websocket infra for notifications.
      fetchNotifications(true);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchNotifications(true);
  }, [open]);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  async function markAllRead() {
    const prev = notifications;
    setNotifications((curr) => curr.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await api.patch("/api/notifications/read-all");
    } catch {
      setNotifications(prev);
      setUnread(prev.filter((n) => !n.isRead).length);
      toast("Could not mark all as read", "error");
    }
  }

  async function markRead(id: string) {
    const prev = notifications;
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    setNotifications((curr) => curr.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));

    try {
      await api.patch(`/api/notifications/${id}`);
    } catch {
      setNotifications(prev);
      setUnread(prev.filter((n) => !n.isRead).length);
      toast("Could not update notification", "error");
    }
  }

  async function remove(id: string) {
    const prev = notifications;
    const wasUnread = notifications.find((n) => n.id === id && !n.isRead);

    setNotifications((curr) => curr.filter((n) => n.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));

    try {
      await api.delete(`/api/notifications/${id}`);
    } catch {
      setNotifications(prev);
      setUnread(prev.filter((n) => !n.isRead).length);
      toast("Could not delete notification", "error");
    }
  }

  const unreadLabel = useMemo(() => (unread > 99 ? "99+" : String(unread)), [unread]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {unread > 0 && (
          <>
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadLabel}
            </span>
            <span className="absolute right-0 top-0 h-2 w-2 animate-ping rounded-full bg-red-500" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 top-full mt-2 w-[22rem] max-w-[92vw] rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {loading && notifications.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`mb-1 rounded-lg border px-2.5 py-2 ${
                      n.isRead ? "border-slate-100 bg-white" : "border-brand-100 bg-brand-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{n.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-brand-700 hover:bg-brand-100"
                          >
                            Read
                          </button>
                        )}
                        <button
                          onClick={() => remove(n.id)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
