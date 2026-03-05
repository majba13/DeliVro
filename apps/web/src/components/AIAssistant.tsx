"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const WELCOME: Message = {
  id: 0,
  role: "assistant",
  text: "Hi there! 👋 I'm DeliVro's AI assistant. Ask me about products, orders, delivery, or payments!"
};

const QUICK_PROMPTS = [
  "How do I track my order?",
  "What payment methods do you accept?",
  "How long does delivery take?",
  "Can I return a product?"
];

export function AIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  let nextId = useRef(1);

  /* Scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: nextId.current++, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, userId: user?.id })
      });

      if (!res.ok) throw new Error("API error");
      const data: { reply: string } = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", text: data.reply ?? "Sorry, I couldn't understand that." }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", text: "I'm having trouble connecting right now. Please try again shortly." }
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-24 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 bg-brand-600 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-600 text-lg font-bold">AI</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">DeliVro Assistant</p>
                <p className="text-[10px] text-brand-200">Always online</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto rounded-full p-1 text-white hover:bg-brand-500"
                aria-label="Close chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 0 }}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-xl rounded-bl-sm bg-slate-100 px-3 py-2">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        className="block h-1.5 w-1.5 rounded-full bg-slate-400"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts (only before user sends anything) */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-medium text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
                aria-label="Send"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Notification dot (shown when closed) */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
          </span>
        )}
      </motion.button>
    </>
  );
}
