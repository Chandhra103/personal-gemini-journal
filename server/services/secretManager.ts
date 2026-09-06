import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let client: SecretManagerServiceClient | null = null;
let cachedKey: string | null = null;

function getClient(): SecretManagerServiceClient {
  if (!client) client = new SecretManagerServiceClient();
  return client;
}

export async function getGeminiApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  // Secure environment injection is supported for Cloud Run/Vercel-style deploys.
  // The browser never receives this value.
  if (process.env.GEMINI_API_KEY) {
    cachedKey = process.env.GEMINI_API_KEY;
    return cachedKey;
  }

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error("GEMINI_SECRET_NOT_CONFIGURED");
  }

  const [version] = await getClient().accessSecretVersion({
    name: `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`,
  });
  const value = version.payload?.data?.toString("utf8").trim();
  if (!value) throw new Error("GEMINI_SECRET_EMPTY");

  cachedKey = value;
  return value;
}
