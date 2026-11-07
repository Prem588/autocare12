export const LOCAL_ACCOUNTS_KEY = "autocare-local-accounts:v1";
export const LOCAL_SESSION_KEY = "autocare-local-session:v1";

const PASSWORD_HASH_ITERATIONS = 310000;

function getStorage() {
  return window.localStorage;
}

function readAccounts() {
  const raw = getStorage().getItem(LOCAL_ACCOUNTS_KEY);
  if (raw === null) return [];

  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts) || accounts.some((account) => (
    !account || typeof account.id !== "string" || typeof account.name !== "string"
    || typeof account.email !== "string" || typeof account.salt !== "string"
    || typeof account.hash !== "string"
  ))) {
    throw new Error("Local account data is invalid. Clear the browser's AutoCare account data to continue.");
  }
  return accounts;
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16));
}

async function hashPassword(password, salt) {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await window.crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: PASSWORD_HASH_ITERATIONS,
  }, keyMaterial, 256);
  return new Uint8Array(derivedBits);
}

async function createPasswordRecord(password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);
  return { salt: bytesToHex(salt), hash: bytesToHex(hash) };
}

async function verifyPassword(password, record) {
  const hash = await hashPassword(password, hexToBytes(record.salt));
  const expected = hexToBytes(record.hash);
  return hash.length === expected.length
    && hash.every((byte, index) => byte === expected[index]);
}

export async function registerLocalAccount({ name, email, password }) {
  const accounts = readAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account with this email address already exists in this browser.");
  }

  const account = {
    id: window.crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    role: "Admin",
    ...await createPasswordRecord(password),
  };
  getStorage().setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
}

export async function loginLocalAccount({ identifier, password }) {
  const email = identifier.trim().toLowerCase();
  const account = readAccounts().find((item) => item.email === email);
  if (!account || !await verifyPassword(password, account)) {
    throw new Error("Email or password is incorrect.");
  }

  const user = { id: account.id, name: account.name, email: account.email, role: account.role };
  getStorage().setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  return user;
}

export function getLocalSession() {
  const raw = getStorage().getItem(LOCAL_SESSION_KEY);
  if (raw === null) return null;

  const user = JSON.parse(raw);
  if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
    throw new Error("Local sign-in data is invalid. Sign in again to continue.");
  }
  return user;
}

export function logoutLocalAccount() {
  getStorage().removeItem(LOCAL_SESSION_KEY);
}

export async function changeLocalPassword({ userId, currentPassword, newPassword }) {
  const accounts = readAccounts();
  const accountIndex = accounts.findIndex((item) => item.id === userId);
  const account = accounts[accountIndex];
  if (!account || !await verifyPassword(currentPassword, account)) {
    throw new Error("The current password is incorrect.");
  }

  const updatedAccount = { ...account, ...await createPasswordRecord(newPassword) };
  accounts[accountIndex] = updatedAccount;
  getStorage().setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}
