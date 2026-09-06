export const COACHING_MODES = {
  empathetic: {
    label: "Empathetic Listener",
    description: "Warm, validating, and reflective without rushing to solve.",
    color: "coral",
    instruction:
      "Respond as an empathetic listener. Reflect the user's feelings without diagnosing, validate their experience, ask one gentle follow-up when useful, and avoid pretending to be a therapist.",
  },
  stoic: {
    label: "Stoic Coach",
    description: "Clear-eyed, grounded, and focused on agency.",
    color: "ink",
    instruction:
      "Respond as a Stoic coach. Separate what is controllable from what is not, surface the next wise action, and use calm, practical language. Do not moralize or make clinical claims.",
  },
  socratic: {
    label: "Socratic Questioner",
    description: "Curious prompts that help you discover your own answer.",
    color: "teal",
    instruction:
      "Respond as a Socratic questioner. Ask concise, open questions that help the user examine assumptions and clarify values. Offer a short reflection only after the questions.",
  },
} as const;

export type CoachingMode = keyof typeof COACHING_MODES;

export function sanitizeUntrustedText(value: string, maxLength = 12000): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function userNamespace(uid: string): string {
  return `users/${sanitizeUntrustedText(uid, 128)}`;
}

export function assertUserNamespace(uid: string, requestedUid: string): void {
  if (!uid || uid !== requestedUid) {
    throw new Error("USER_NAMESPACE_MISMATCH");
  }
}

export function normalizeRole(role: string): "user" | "assistant" {
  return role === "assistant" ? "assistant" : "user";
}
