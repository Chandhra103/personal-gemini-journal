# Personal Gemini Journal

**Personal Gemini Journal** is a production-oriented authenticated reflection workspace built for the Cohort 3 final challenge. It combines Firebase Authentication, server-verified Gemini conversations, user-isolated Firestore persistence, Google Cloud Secret Manager, and three enhancements: coaching modes, weekly AI insight reports, and encrypted export plus deletion safeguards.

## What is included

The application provides Google and email/password sign-in through Firebase Authentication. The browser obtains a Firebase ID token, and the Express/tRPC backend verifies that token with `firebase-admin` before any protected journal operation. The chat is multi-turn and offers **Empathetic Listener**, **Stoic Coach**, and **Socratic Questioner** modes. Messages are sent to Gemini only from server-side code.

After each multi-turn response, a second server-side Gemini pass produces a neutral one-sentence `summary`, and the transcript plus summary are persisted under `users/{uid}/journal_entries/{entryId}`. Weekly reports live under `users/{uid}/insight_reports/latest`. Firestore rules deny access by default and compare the path user ID to `request.auth.uid`. The Gemini key is loaded from Google Cloud Secret Manager using the `GEMINI_API_KEY` secret name; the client bundle receives no Gemini credential. The export control uses browser Web Crypto AES-GCM with a user-selected passphrase. Deletion is a user-initiated operation and is confirmed in the interface.

## Architecture

```text
Firebase Auth (browser)
        │ Firebase ID token
        ▼
Express + tRPC API ── firebase-admin verifyIdToken()
        │
        ├── Secret Manager → GEMINI_API_KEY → Gemini API
        └── Firestore
              └── users/{uid}/journal_entries/{entryId}
              └── users/{uid}/insight_reports/latest
```

The application is scaffolded on a React 19 + Vite + TypeScript frontend and an Express + tRPC backend. The existing Manus session remains available as a local-preview compatibility path in the scaffold, but production protected journal operations are designed for the Firebase Bearer-token path. If the public Firebase variables are absent, the UI intentionally renders a read-only preview workspace rather than pretending that persistence or AI is working.

## Phase 1: Google AI Studio constitution

The exact custom instruction text is in [`studio_security_directive.md`](./studio_security_directive.md). Paste it into Google AI Studio Custom instructions before using AI Studio to generate or alter application code. It covers threat modeling, prompt injection, XSS, SSRF, strict typing, secure error handling, Firebase authorization, Firestore namespace isolation, and Secret Manager rules.

## Local setup

1. Create a Firebase project and enable **Authentication → Google** and **Email/Password** providers.
2. Create a Firestore database and deploy [`firestore.rules`](./firestore.rules):

   ```bash
   firebase deploy --only firestore:rules
   ```

3. Create the Gemini secret in Google Cloud Secret Manager:

   ```bash
   printf '%s' "$GEMINI_API_KEY_VALUE" | gcloud secrets create GEMINI_API_KEY --data-file=-
   ```

   Grant the runtime service account `roles/secretmanager.secretAccessor` on that secret. Do not commit the value or a service-account private key.
4. Copy [`.env.example`](./.env.example) to your runtime environment. Public `VITE_FIREBASE_*` values are safe for the browser. `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GCP_PROJECT_ID`, and Gemini credentials are server-only.
5. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

6. Open the preview URL. Without Firebase public config, the app shows a safe preview mode. With Firebase public config, the landing page requires Firebase sign-in.

## Cloud Run deployment

Build the provided project with `pnpm build` and deploy the resulting Node server to Cloud Run. Configure the `VITE_FIREBASE_*` values at build time and configure the server-only Firebase/Google Cloud values as runtime environment variables or Secret Manager references. Prefer Cloud Run workload identity and Application Default Credentials over a downloaded service-account JSON file. Ensure the Firebase authorized domain includes the deployed domain.

Example high-level sequence:

```bash
pnpm build
gcloud run deploy personal-gemini-journal \
  --source . \
  --region YOUR_REGION \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT,GEMINI_MODEL=gemini-2.5-flash \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

For Vercel, keep the Express API in a server-capable deployment target and configure the same server-only values in the project environment settings. Never use `VITE_GEMINI_API_KEY`; any client-prefixed Gemini key would be a deployment failure.

## Tests and verification

Run:

```bash
pnpm check
pnpm test
pnpm build
```

The security tests cover removal of control characters, bounded input, canonical user namespace construction, and rejection of mismatched user IDs. For a Firebase Emulator Suite verification, create two users, sign in as user A, attempt to read/write a user B path, and confirm Firestore returns `PERMISSION_DENIED`. Also inspect the production browser bundle and confirm that it contains no `GEMINI_API_KEY`, Secret Manager secret value, or Firebase Admin private key.

## Production checklist

- [ ] Firebase Google and email/password providers enabled.
- [ ] Firebase authorized domains configured for the deployed hostname.
- [ ] Firestore rules deployed from `firestore.rules`.
- [ ] `GEMINI_API_KEY` created in Secret Manager.
- [ ] Runtime service account can access only the required secret and Firestore resources.
- [ ] No secret uses a `VITE_` prefix; no secrets are committed.
- [ ] Backend ID-token verification and revoked-token checks are enabled.
- [ ] Rate limiting, monitoring, alerting, and backup/retention policies are configured for the chosen deployment.
- [ ] Emulator or staging test confirms user A cannot access user B's entries or reports.

## Scope note

This repository contains the complete application code and deployment configuration, but Firebase project creation, provider enablement, Firestore provisioning, Secret Manager values, and runtime IAM permissions are operator-owned cloud configuration steps. The application fails closed with safe configuration errors when those production dependencies are missing.
