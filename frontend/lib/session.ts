import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ApiUser } from "@/lib/api";
import { apiFetch, getAuthHeader } from "@/lib/api";

const TOKEN_COOKIE = "flylogx-token";

export async function getSessionToken() {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function requireSession() {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  return token;
}

export async function fetchCurrentUser(token: string) {
  return apiFetch<ApiUser>("/api/auth/me", {
    headers: {
      ...getAuthHeader(token),
    },
  });
}

export async function loadSession() {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  try {
    const user = await fetchCurrentUser(token);
    return { token, user };
  } catch {
    redirect("/login");
  }
}
