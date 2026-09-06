import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyFirebaseIdToken } from "../services/firebaseAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  uid: string | null;
  authProvider: "firebase" | "manus" | "none";
};

function userFromFirebase(decoded: { uid: string; email?: string; name?: string }): User {
  return {
    id: 0,
    openId: decoded.uid,
    name: decoded.name ?? null,
    email: decoded.email ?? null,
    loginMethod: "firebase",
    role: "user",
    createdAt: new Date(0),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const authorization = opts.req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    try {
      const decoded = await verifyFirebaseIdToken(authorization.slice("Bearer ".length));
      return {
        req: opts.req,
        res: opts.res,
        user: userFromFirebase(decoded),
        uid: decoded.uid,
        authProvider: "firebase",
      };
    } catch {
      return { req: opts.req, res: opts.res, user: null, uid: null, authProvider: "none" };
    }
  }

  try {
    const user = await sdk.authenticateRequest(opts.req);
    return {
      req: opts.req,
      res: opts.res,
      user,
      uid: user?.openId ?? null,
      authProvider: user ? "manus" : "none",
    };
  } catch {
    return { req: opts.req, res: opts.res, user: null, uid: null, authProvider: "none" };
  }
}
