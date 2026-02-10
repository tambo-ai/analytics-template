import { useState } from "react";

const STORAGE_KEY = "tambo-user-key";

function getOrCreateUserKey(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const newKey = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, newKey);
  return newKey;
}

export function useAnonymousUserKey(): string {
  const [userKey] = useState(getOrCreateUserKey);
  return userKey;
}
