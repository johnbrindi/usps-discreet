"use client";
import { createAuthClient } from "better-auth/react";

// No baseURL: requests go to the current origin, so sign-in works on both the apex and www hosts
// (an absolute URL to another host is cross-origin and blocked by the CSP's connect-src 'self').
export const authClient = createAuthClient();
