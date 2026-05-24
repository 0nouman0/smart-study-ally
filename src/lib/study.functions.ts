import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChatInput = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
});

export const listChatSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    return { sessions: data ?? [] };
  });

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let sessionId = data.sessionId;
    if (!sessionId) {
      // Create a new session
      const title = data.message.length > 40 ? data.message.slice(0, 40) + "..." : data.message;
      const { data: newSession } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      sessionId = newSession?.id;
    }

    if (!sessionId) {
      return { reply: "Could not create chat session.", error: true };
    }

    // Update the session's updated_at
    await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);

    // pull last ~20 messages for context
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(20);

    const priorMessages = (history ?? []).reverse().map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // save the new user message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "user",
      content: data.message,
      session_id: sessionId,
    });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return { reply: "AI is not configured yet. Please contact support.", error: true };
    }

    const systemPrompt =
      "You are Kinetic, a focused AI study tutor for students aged 12–25. " +
      "Explain concepts clearly, give worked examples, and offer concrete study strategies. " +
      "Keep replies tight (under 250 words unless asked). Use bullet points and bold key terms. " +
      "Never invent facts — say when you're unsure. Be warm but not childish.";

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...priorMessages,
            { role: "user", content: data.message },
          ],
        }),
      });

      if (res.status === 429) {
        return { reply: "Rate limit hit. Please wait a moment and try again.", error: true };
      }
      if (res.status === 402) {
        return { reply: "AI credits exhausted. Please add credits in your workspace.", error: true };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("AI gateway error:", res.status, text);
        return { reply: "The tutor hit a snag. Try again in a moment.", error: true };
      }

      const json = await res.json();
      const reply: string =
        json.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

      await supabase.from("chat_messages").insert({
        user_id: userId,
        role: "assistant",
        content: reply,
        session_id: sessionId,
      });

      return { reply, sessionId, error: false };
    } catch (e) {
      console.error("askTutor failed:", e);
      return { reply: "Network error reaching the tutor.", error: true };
    }
  });

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(100);
    return { messages: messages ?? [] };
  });

// ---------- Profile / XP ----------

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, xp, level, streak_days, last_active_date")
      .eq("id", userId)
      .maybeSingle();
    return {
      profile: data ?? { display_name: null, xp: 0, level: 1, streak_days: 0, last_active_date: null },
    };
  });

export const awardXp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ amount: z.number().int().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("xp, level, streak_days, last_active_date")
      .eq("id", userId)
      .maybeSingle();
    const xp = (prof?.xp ?? 0) + data.amount;
    const level = Math.max(1, Math.floor(xp / 250) + 1);
    const today = new Date().toISOString().slice(0, 10);
    let streak = prof?.streak_days ?? 0;
    if (prof?.last_active_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = prof?.last_active_date === yesterday ? streak + 1 : 1;
    }
    await supabase
      .from("profiles")
      .update({ xp, level, streak_days: streak, last_active_date: today, updated_at: new Date().toISOString() })
      .eq("id", userId);
    return { xp, level, streak };
  });

// ---------- Tasks ----------

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("tasks")
      .select("id, title, subject, priority, due_at, duration_minutes, completed, completed_at")
      .eq("user_id", userId)
      .order("completed", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false });
    return { tasks: data ?? [] };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      title: z.string().min(1).max(200),
      subject: z.string().max(60).optional().nullable(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      due_at: z.string().datetime().optional().nullable(),
      duration_minutes: z.number().int().min(5).max(600).default(45),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      title: data.title,
      subject: data.subject ?? null,
      priority: data.priority,
      due_at: data.due_at ?? null,
      duration_minutes: data.duration_minutes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("tasks")
      .update({
        completed: data.completed,
        completed_at: data.completed ? new Date().toISOString() : null,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("tasks").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Flashcards ----------

export const listDueFlashcards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("flashcards")
      .select("id, front, back, subject, ease, interval_days, due_at, review_count")
      .eq("user_id", userId)
      .order("due_at", { ascending: true })
      .limit(200);
    return { cards: data ?? [] };
  });

export const createFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      front: z.string().min(1).max(500),
      back: z.string().min(1).max(2000),
      subject: z.string().max(60).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("flashcards").insert({
      user_id: userId,
      front: data.front,
      back: data.back,
      subject: data.subject ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      // quality: 0 again, 1 hard, 2 good, 3 easy
      quality: z.number().int().min(0).max(3),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: card } = await supabase
      .from("flashcards")
      .select("ease, interval_days, review_count")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!card) throw new Error("Card not found");

    let ease = card.ease;
    let interval = card.interval_days;
    if (data.quality === 0) {
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    } else if (data.quality === 1) {
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(1.3, ease - 0.05);
    } else if (data.quality === 2) {
      interval = Math.round(interval * ease);
    } else {
      interval = Math.round(interval * ease * 1.3);
      ease = Math.min(3.0, ease + 0.05);
    }
    const due = new Date(Date.now() + interval * 86400000).toISOString();
    await supabase
      .from("flashcards")
      .update({
        ease, interval_days: interval, due_at: due,
        review_count: card.review_count + 1,
      })
      .eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

// ---------- Focus sessions ----------

export const logFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      duration_minutes: z.number().int().min(1).max(180),
      subject: z.string().max(60).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("focus_sessions").insert({
      user_id: userId,
      duration_minutes: data.duration_minutes,
      subject: data.subject ?? null,
      completed_at: new Date().toISOString(),
    });
    return { ok: true };
  });
