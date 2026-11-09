import { headers } from "next/headers";
import { auth } from "./auth.js";

export async function getRequiredSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const error = new Error("Authentication required.");
    error.status = 401;
    throw error;
  }
  return session;
}
