import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  deleteAllJournalEntries,
  getLatestInsightReport,
  listJournalEntries,
  saveInsightReport,
  saveJournalEntry,
  type JournalMessage,
} from "./services/firestore";
import { generateEntrySummary, generateJournalReply, generateWeeklyInsight } from "./services/gemini";
import { COACHING_MODES, sanitizeUntrustedText, type CoachingMode } from "./services/security";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});
const modeSchema = z.enum(["empathetic", "stoic", "socratic"]);

type AuthContext = { uid: string | null; authProvider: "firebase" | "manus" | "none" };

function requireUid(ctx: AuthContext): string {
  const firebaseRequired = process.env.NODE_ENV === "production";
  if (!ctx.uid || (firebaseRequired && ctx.authProvider !== "firebase")) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A verified Firebase session is required." });
  }
  return ctx.uid;
}

function safeServerError(error: unknown): TRPCError {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "GEMINI_SECRET_NOT_CONFIGURED" || code === "GEMINI_SECRET_EMPTY") {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: "Gemini is not configured on the server yet." });
  }
  if (code === "FIREBASE_NOT_INITIALIZED") {
    return new TRPCError({ code: "PRECONDITION_FAILED", message: "Firestore is not configured on the server yet." });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The journal service could not complete that request." });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    status: publicProcedure.query((opts) => ({
      authenticated: Boolean(opts.ctx.uid),
      provider: opts.ctx.authProvider,
      firebaseRequired: process.env.NODE_ENV === "production",
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  journal: router({
    modes: publicProcedure.query(() => COACHING_MODES),
    list: protectedProcedure.query(async ({ ctx }) => {
      const uid = requireUid(ctx);
      try {
        return await listJournalEntries(uid);
      } catch (error) {
        throw safeServerError(error);
      }
    }),
    latestInsight: protectedProcedure.query(async ({ ctx }) => {
      const uid = requireUid(ctx);
      try {
        return await getLatestInsightReport(uid);
      } catch (error) {
        throw safeServerError(error);
      }
    }),
    chat: protectedProcedure
      .input(z.object({
        mode: modeSchema,
        title: z.string().max(180).default("Untitled reflection"),
        messages: z.array(messageSchema).min(1).max(20),
        saveEntry: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const uid = requireUid(ctx);
        const safeMessages: JournalMessage[] = input.messages.map((message) => ({
          role: message.role,
          content: sanitizeUntrustedText(message.content),
        }));
        try {
          const reply = await generateJournalReply(input.mode as CoachingMode, safeMessages);
          const nextMessages: JournalMessage[] = [...safeMessages, { role: "assistant", content: reply }];
          const summary = await generateEntrySummary(nextMessages);
          const saved = input.saveEntry
            ? await saveJournalEntry(uid, {
                title: sanitizeUntrustedText(input.title, 180) || "Untitled reflection",
                body: nextMessages.find((message) => message.role === "user")?.content ?? "",
                summary,
                mode: input.mode,
                messages: nextMessages,
              })
            : null;
          return { reply, entry: saved };
        } catch (error) {
          throw safeServerError(error);
        }
      }),
    weeklyInsight: protectedProcedure.mutation(async ({ ctx }) => {
      const uid = requireUid(ctx);
      try {
        const entries = await listJournalEntries(uid, 50);
        const report = await generateWeeklyInsight(entries);
        await saveInsightReport(uid, report);
        return report;
      } catch (error) {
        throw safeServerError(error);
      }
    }),
    deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
      const uid = requireUid(ctx);
      try {
        await deleteAllJournalEntries(uid);
        return { success: true } as const;
      } catch (error) {
        throw safeServerError(error);
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
