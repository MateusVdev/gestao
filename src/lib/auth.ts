import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { demoUsers } from "@/lib/demo-data";
import type { AppUser } from "@/lib/types";

const SESSION_COOKIE = "coop_session";
const SESSION_DURATION = 60 * 60 * 8;

function getSecret() {
  const raw =
    process.env.AUTH_SECRET ??
    "coopfleet-development-secret-change-before-production";
  return new TextEncoder().encode(raw);
}

export async function createSession(user: AppUser) {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role === "OPERATOR" ? "OPERATOR" : "ADMIN",
    };
  } catch {
    return null;
  }
}

export async function validateCredentials(
  email: string,
  password: string,
): Promise<AppUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user && (await bcrypt.compare(password, user.passwordHash))) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    } catch {
      // Falls back to demo credentials when the database is not reachable.
    }
  }

  if (normalizedEmail === "admin@coopfleet.com" && password === "admin123") {
    return demoUsers[0] ?? null;
  }

  return null;
}

export function isAdmin(user: AppUser | null) {
  return user?.role === "ADMIN";
}
