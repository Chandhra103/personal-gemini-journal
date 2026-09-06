import { useCallback, useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Feather,
  FileText,
  Flame,
  Heart,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  WandSparkles,
} from "lucide-react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  firebaseConfigured,
  getFirebaseIdToken,
  signInWithEmail,
  signInWithGoogle,
  signOutFirebase,
  subscribeToFirebaseAuth,
} from "@/lib/firebase";

const modes = {
  empathetic: { label: "Empathetic listener", icon: Heart, tint: "rose", prompt: "What would you like to make a little more spacious today?" },
  stoic: { label: "Stoic coach", icon: Target, tint: "amber", prompt: "What is within your control in this situation?" },
  socratic: { label: "Socratic questioner", icon: BrainCircuit, tint: "teal", prompt: "What assumption is most worth examining right now?" },
} as const;
type Mode = keyof typeof modes;
type ChatMessage = { role: "user" | "assistant"; content: string };

type Insight = {
  theme?: string;
  moodTrajectory?: string;
  highlights?: string[];
  recurringThoughts?: string[];
  nextExperiment?: string;
};

const previewEntries = [
  { id: "p1", title: "A quieter kind of progress", body: "Not everything has to be optimized. Today I noticed I was most focused after I stopped trying to prove I was focused.", mode: "empathetic", createdAt: "Today · 8:42 AM" },
  { id: "p2", title: "The next honest step", body: "I can’t control the pace of the project, but I can control whether I make the next decision visible.", mode: "stoic", createdAt: "Yesterday · 6:18 PM" },
  { id: "p3", title: "A question worth keeping", body: "If I already trusted my own judgment, what would I stop explaining?", mode: "socratic", createdAt: "Mon · 7:05 AM" },
];

function initials(user: User | null): string {
  if (!user) return "Y";
  return (user.displayName || user.email || "You").slice(0, 1).toUpperCase();
}

async function downloadEncryptedExport(payload: unknown): Promise<void> {
  const passphrase = window.prompt("Choose a passphrase for this encrypted export:");
  if (!passphrase) return;
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload, null, 2)));
  const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...Array.from(bytes)));
  const blob = new Blob([JSON.stringify({ version: 1, algorithm: "AES-GCM", kdf: "PBKDF2-SHA-256", iterations: 120000, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `gemini-journal-export-${new Date().toISOString().slice(0, 10)}.encrypted.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Landing({ onGoogle, onEmail, email, setEmail, password, setPassword, authError }: { onGoogle: () => void; onEmail: () => void; email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; authError: string; }) {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#1d2928]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 overflow-hidden lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative flex flex-col justify-between overflow-hidden px-7 py-7 sm:px-12 lg:px-16 lg:py-10">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#d8ece7]/70 blur-2xl" />
          <div className="absolute bottom-20 right-8 h-52 w-52 rounded-full bg-[#f2d8c9]/50 blur-3xl" />
          <div className="relative z-10 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#1d2928] text-[#f7f1e8]"><Feather size={19} /></div><span className="font-display text-[19px] tracking-tight">Gemini Journal</span></div>
          <div className="relative z-10 max-w-2xl py-20 lg:py-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#b3cbc4] bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-[#4d6b64]"><Sparkles size={13} /> A private thinking space</div>
            <h1 className="font-display text-[clamp(3.8rem,7vw,7rem)] leading-[.91] tracking-[-.065em] text-[#1d2928]">Make room<br /><span className="text-[#648e82]">for your thoughts.</span></h1>
            <p className="mt-8 max-w-lg text-[17px] leading-8 text-[#62706c]">A calm place to journal with Gemini, find the thread beneath the noise, and leave each session with one honest next step.</p>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-[#4f615c]"><span className="flex items-center gap-2"><LockKeyhole size={16} className="text-[#648e82]" /> Private by design</span><span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#648e82]" /> Securely scoped</span></div>
          </div>
          <div className="relative z-10 flex items-end justify-between gap-4 border-t border-[#d7d4cd] pt-5 text-[12px] text-[#7a817e]"><span>Thoughtful AI, human-sized.</span><span>v0.1 · Cohort 3</span></div>
        </section>
        <section className="flex items-center justify-center bg-[#1d2928] px-7 py-12 text-[#f7f1e8] sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#a8c6bd]">Your journal, your boundary</p>
            <h2 className="font-display text-4xl leading-tight tracking-[-.04em]">Begin with a clean page.</h2>
            <p className="mt-4 leading-7 text-[#b6c2be]">Sign in to keep your reflections private and available across sessions.</p>
            <div className="mt-8 grid gap-3">
              <button onClick={onGoogle} className="flex h-12 items-center justify-center gap-3 rounded-xl bg-[#f7f1e8] px-4 text-sm font-semibold text-[#1d2928] transition hover:bg-white"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#1d2928] text-xs text-white">G</span> Continue with Google</button>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[.15em] text-[#73807c]"><span className="h-px flex-1 bg-[#50615c]" /> or use email <span className="h-px flex-1 bg-[#50615c]" /></div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 border-[#4a5b56] bg-[#273633] text-[#f7f1e8] placeholder:text-[#7d8c87]" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" onKeyDown={(e) => e.key === "Enter" && onEmail()} className="h-12 border-[#4a5b56] bg-[#273633] text-[#f7f1e8] placeholder:text-[#7d8c87]" />
              <Button onClick={onEmail} className="h-12 rounded-xl bg-[#89b5a8] text-[#1d2928] hover:bg-[#9ecabe]">Sign in securely <ArrowUpRight size={16} /></Button>
              {authError && <p className="text-sm text-[#efab96]">{authError}</p>}
            </div>
            <p className="mt-8 flex gap-2 text-xs leading-5 text-[#8f9c98]"><KeyRound size={15} className="mt-0.5 shrink-0" /> Your Gemini key stays on the server. Journal access is verified with Firebase ID tokens.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ModePicker({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <div className="grid grid-cols-3 gap-2">{Object.entries(modes).map(([key, value]) => { const Icon = value.icon; const active = mode === key; return <button key={key} onClick={() => setMode(key as Mode)} className={`group rounded-2xl border p-3 text-left transition ${active ? "border-[#7fae9f] bg-[#e6f1ed]" : "border-[#e5e1d8] bg-white hover:border-[#b6ccc4]"}`}><div className={`mb-3 grid h-8 w-8 place-items-center rounded-xl ${active ? "bg-[#1d2928] text-[#bfe0d4]" : "bg-[#f2efe9] text-[#71817c]"}`}><Icon size={15} /></div><div className="text-[11px] font-bold leading-4 text-[#31403d]">{value.label}</div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#85908c]">{value.prompt}</div></button>; })}</div>;
}

function Workspace({ firebaseUser, demo }: { firebaseUser: User | null; demo: boolean }) {
  const [mode, setMode] = useState<Mode>("empathetic");
  const [title, setTitle] = useState("A note to return to");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Welcome back. What feels most present for you today?" }]);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [notice, setNotice] = useState("");
  const utils = trpc.useUtils();
  const live = !demo && Boolean(firebaseUser);
  const entriesQuery = trpc.journal.list.useQuery(undefined, { enabled: live, retry: false });
  const insightQuery = trpc.journal.latestInsight.useQuery(undefined, { enabled: live, retry: false });
  const chatMutation = trpc.journal.chat.useMutation({ onSuccess: (result) => { setMessages((current) => [...current, { role: "assistant", content: result.reply }]); void utils.journal.list.invalidate(); setNotice("Saved privately to your journal"); setDraft(""); } });
  const insightMutation = trpc.journal.weeklyInsight.useMutation({ onSuccess: (result) => { setInsight(result as Insight); void utils.journal.latestInsight.invalidate(); } });
  const deleteMutation = trpc.journal.deleteAll.useMutation({ onSuccess: () => { void utils.journal.list.invalidate(); setNotice("Your journal entries were deleted"); } });
  const entries = demo ? previewEntries : entriesQuery.data ?? [];
  const latestInsight = insight ?? (insightQuery.data as Insight | null | undefined);
  const activeMode = modes[mode];

  const sendMessage = useCallback(() => {
    const clean = draft.trim();
    if (!clean) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    if (demo) {
      window.setTimeout(() => { setMessages((current) => [...current, { role: "assistant", content: "That is worth staying with. If you let the thought be true without needing to solve it immediately, what becomes clearer?" }]); setDraft(""); setNotice("Preview mode · connect Firebase to save this reflection"); }, 450);
    } else {
      chatMutation.mutate({ mode, title, messages: next, saveEntry: true });
    }
  }, [chatMutation, demo, draft, messages, mode, title]);

  const doExport = async () => { await downloadEncryptedExport({ exportedAt: new Date().toISOString(), entries }); setNotice("Encrypted export downloaded"); };
  const deleteAll = () => { if (!demo && window.confirm("Delete every journal entry? This cannot be undone.")) deleteMutation.mutate(); else if (demo) setNotice("Preview entries are read-only"); };

  return <div className="min-h-screen bg-[#f8f5ef] text-[#263331]">
    <header className="sticky top-0 z-20 border-b border-[#e7e2d8]/90 bg-[#f8f5ef]/90 backdrop-blur-xl"><div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"><div className="flex items-center gap-8"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1d2928] text-[#eef6f1]"><Feather size={17} /></div><span className="font-display text-[18px] tracking-tight">Gemini Journal</span></div><nav className="hidden items-center gap-5 text-[12px] font-semibold text-[#72807b] md:flex"><span className="border-b-2 border-[#6c9e8e] py-7 text-[#263331]">Today</span><span className="py-7 transition hover:text-[#263331]">Archive</span><span className="py-7 transition hover:text-[#263331]">Insights</span></nav></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-[#dcded6] bg-white/65 px-3 py-1.5 text-[11px] font-semibold text-[#6b7b75] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#76a894]" /> {demo ? "Preview mode" : "Private session"}</div><button onClick={() => void signOutFirebase()} className="grid h-9 w-9 place-items-center rounded-full bg-[#cfe2db] text-[12px] font-bold text-[#315449]">{initials(firebaseUser)}</button></div></div></header>
    <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
      <section className="min-w-0"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.19em] text-[#789087]"><span>Wednesday, September 06</span><span className="h-1 w-1 rounded-full bg-[#b5c4bd]" /> <span>Week 36</span></div><h1 className="font-display text-4xl tracking-[-.04em] text-[#263331] sm:text-5xl">Good morning{firebaseUser?.displayName ? `, ${firebaseUser.displayName.split(" ")[0]}` : "."}</h1><p className="mt-2 text-sm text-[#7a8681]">A few minutes of noticing can change the shape of a day.</p></div><Button variant="outline" onClick={() => { setMessages([{ role: "assistant", content: "Welcome back. What feels most present for you today?" }]); setDraft(""); }} className="h-10 rounded-xl border-[#d9ded8] bg-white/50 text-[#536760]"><Plus size={16} /> New reflection</Button></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(280px,.82fr)]"><div className="overflow-hidden rounded-[26px] border border-[#dfe7e1] bg-[#e7f1ec] shadow-[0_16px_50px_-35px_rgba(29,41,40,.5)]"><div className="border-b border-[#d2e4dc] px-6 pb-5 pt-6 sm:px-8"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#688a7e]"><MessageCircle size={14} /> Reflection room</div><div className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#688a7e]">{activeMode.label}</div></div><input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-5 w-full bg-transparent font-display text-2xl tracking-[-.03em] text-[#263c36] outline-none placeholder:text-[#90aa9f]" placeholder="Name this reflection" /></div><div className="flex max-h-[310px] min-h-[230px] flex-col gap-4 overflow-y-auto px-6 py-5 sm:px-8">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-6 ${message.role === "user" ? "rounded-br-md bg-[#31554b] text-[#eff8f3]" : "rounded-bl-md bg-white/75 text-[#486158]"}`}>{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : message.content}</div></div>)}</div><div className="px-6 pb-6 sm:px-8"><div className="rounded-2xl border border-[#c9ddd3] bg-white/70 p-2 focus-within:border-[#7fae9f] focus-within:ring-4 focus-within:ring-[#b6d9cb]/35"><Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={activeMode.prompt} className="min-h-[72px] resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-[#355148] shadow-none focus-visible:ring-0" /><div className="flex items-center justify-between px-2 pt-2"><span className="text-[10px] text-[#89a096]">Enter to send · Shift + Enter for a new line</span><Button onClick={sendMessage} disabled={chatMutation.isPending || !draft.trim()} size="icon" className="h-9 w-9 rounded-xl bg-[#1d2928] text-[#d9efe6] hover:bg-[#31554b]"><ArrowUpRight size={17} /></Button></div></div>{chatMutation.error && <p className="mt-2 text-xs text-[#b15f4b]">{chatMutation.error.message}</p>}</div></div>
          <div className="rounded-[26px] border border-[#e8e2d8] bg-white/70 p-5"><div className="mb-5 flex items-start justify-between"><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#9a806e]"><WandSparkles size={14} /> Your modes</div><h2 className="mt-2 font-display text-2xl tracking-[-.03em]">Choose a lens.</h2></div><MoreHorizontal size={18} className="text-[#a8aaa2]" /></div><ModePicker mode={mode} setMode={setMode} /><div className="mt-5 rounded-2xl bg-[#f4f0e9] p-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#9b8e7d]">How it works</p><p className="mt-2 text-[12px] leading-5 text-[#7d817b]">Each mode adds a distinct coaching lens while your words stay the source of truth.</p></div></div></div>
        <div className="mt-9"><div className="mb-4 flex items-center justify-between"><div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.19em] text-[#829087]"><BookOpen size={14} /> Recent reflections</div><h2 className="mt-1 font-display text-2xl tracking-[-.03em]">The thread so far</h2></div><button className="flex items-center gap-1 text-xs font-semibold text-[#6e8f84] hover:text-[#31554b]">View archive <ChevronRight size={14} /></button></div><div className="grid gap-3 md:grid-cols-3">{entries.slice(0, 3).map((entry) => <article key={entry.id} className="group rounded-2xl border border-[#e8e4db] bg-white/60 p-5 transition hover:-translate-y-0.5 hover:border-[#bfd4ca] hover:bg-white"><div className="flex items-center justify-between"><span className="rounded-full bg-[#edf3ef] px-2 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#6e8f84]">{entry.mode}</span><MoreHorizontal size={16} className="text-[#a9aca4] opacity-0 transition group-hover:opacity-100" /></div><h3 className="mt-4 line-clamp-1 font-display text-[19px] tracking-[-.02em] text-[#35423f]">{entry.title}</h3><p className="mt-2 line-clamp-3 text-[12px] leading-5 text-[#818983]">{entry.body}</p><div className="mt-5 flex items-center gap-1.5 text-[10px] text-[#a0a49d]"><Clock3 size={12} /> {typeof entry.createdAt === "string" ? entry.createdAt : "Recently"}</div></article>)}</div></div></section>
      <aside className="space-y-5"><div className="rounded-[26px] bg-[#1d2928] p-6 text-[#eff7f1] shadow-[0_20px_60px_-30px_rgba(29,41,40,.8)]"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#a7c9bd]"><Flame size={14} /> Weekly signal</div><span className="rounded-full bg-[#304944] px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#afd2c5]">7 days</span></div><h2 className="mt-5 font-display text-[27px] leading-[1.05] tracking-[-.035em]">See the pattern,<br /><span className="text-[#91c3b2]">not just the day.</span></h2><p className="mt-3 text-[12px] leading-5 text-[#afbbb6]">Gemini can gently surface themes and a mood trajectory from your private entries.</p><Button onClick={() => demo ? setNotice("Preview mode · connect Firebase and Gemini to generate an insight") : insightMutation.mutate()} disabled={insightMutation.isPending} className="mt-6 h-10 w-full rounded-xl bg-[#9ac5b7] text-[#1d2928] hover:bg-[#acd4c7]">{insightMutation.isPending ? <RefreshCw className="animate-spin" size={15} /> : <Sparkles size={15} />} {latestInsight ? "Refresh reflection" : "Generate reflection"}</Button></div>
        <div className="rounded-[26px] border border-[#e8e2d8] bg-white/65 p-6"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#9b806e]"><Sparkles size={14} /> Latest insight</div>{latestInsight ? <div className="mt-4 space-y-4"><p className="font-display text-[21px] leading-tight text-[#384440]">{latestInsight.theme}</p><div className="flex items-center justify-between rounded-xl bg-[#f3eee6] px-3 py-2 text-xs"><span className="text-[#8b8c82]">Mood trajectory</span><span className="font-bold capitalize text-[#658a7e]">{latestInsight.moodTrajectory}</span></div><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a19a8d]">What keeps returning</p><ul className="mt-2 space-y-2 text-xs leading-5 text-[#727b75]">{(latestInsight.recurringThoughts ?? latestInsight.highlights ?? []).slice(0, 3).map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#8fb7a9]" /> {item}</li>)}</ul></div><div className="border-t border-[#e9e2d8] pt-3 text-xs leading-5 text-[#65716c]"><span className="font-bold text-[#4e7569]">Try next · </span>{latestInsight.nextExperiment}</div></div> : <div className="mt-4 rounded-2xl bg-[#f5f1ea] p-4"><p className="text-xs leading-5 text-[#83887f]">Your first weekly reflection will appear here after a few journal sessions.</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e5e0d7]"><div className="h-full w-2/3 rounded-full bg-[#b5d3c8]" /></div><p className="mt-2 text-[10px] text-[#a4a398]">A little data, a little distance.</p></div>}</div>
        <div className="rounded-[26px] border border-[#e8e2d8] bg-white/65 p-6"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#829087]"><ShieldCheck size={14} /> Privacy center</div><div className="mt-4 space-y-3 text-xs text-[#77827d]"><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#edf3ef] text-[#608a7a]"><LockKeyhole size={13} /></span><span>Firebase-verified sessions</span><Check size={14} className="ml-auto text-[#78a894]" /></div><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f4eee7] text-[#a6826c]"><KeyRound size={13} /></span><span>Secret Manager key vault</span><Check size={14} className="ml-auto text-[#78a894]" /></div></div><div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={doExport} variant="outline" className="h-9 rounded-xl border-[#dedfd8] bg-transparent text-[11px] text-[#66746e]"><Download size={13} /> Encrypted export</Button><Button onClick={deleteAll} variant="outline" className="h-9 rounded-xl border-[#dedfd8] bg-transparent text-[11px] text-[#a86f61] hover:bg-[#f7ebe7]"><Trash2 size={13} /> Delete data</Button></div></div>
      </aside></div>{notice && <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1d2928] px-4 py-2.5 text-xs font-semibold text-[#eaf6ef] shadow-xl"><Check size={14} className="text-[#9ac5b7]" /> {notice}</div>}</main>
  </div>;
}

export default function Home() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  useEffect(() => subscribeToFirebaseAuth(setFirebaseUser), []);
  const signInGoogle = async () => { try { setAuthError(""); await signInWithGoogle(); } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to sign in."); } };
  const signInEmail = async () => { try { setAuthError(""); await signInWithEmail(email, password); } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to sign in."); } };
  if (firebaseConfigured && !firebaseUser) return <Landing onGoogle={signInGoogle} onEmail={signInEmail} email={email} setEmail={setEmail} password={password} setPassword={setPassword} authError={authError} />;
  return <Workspace firebaseUser={firebaseUser} demo={!firebaseConfigured} />;
}
