import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import {
  changeLocalPassword,
  getLocalSession,
  LOCAL_ACCOUNTS_KEY,
  LOCAL_SESSION_KEY,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
} from "./localAuth.js";
import {
  loadWorkspace,
  saveWorkspace,
  WORKSPACE_STORAGE_PREFIX,
} from "./workspaceApi.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("local accounts register, authenticate, change password, and sign out", async () => {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: createStorage(), crypto: webcrypto };
  try {
    await registerLocalAccount({
      name: "Workshop Admin",
      email: "ADMIN@example.com",
      password: "correct horse battery staple",
    });

    const storedAccounts = JSON.parse(window.localStorage.getItem(LOCAL_ACCOUNTS_KEY));
    assert.equal(storedAccounts[0].email, "admin@example.com");
    assert.equal(storedAccounts[0].role, "Admin");
    assert.equal("password" in storedAccounts[0], false);
    assert.notEqual(storedAccounts[0].hash, "correct horse battery staple");
    assert.notEqual(storedAccounts[0].hash, storedAccounts[0].salt);

    const user = await loginLocalAccount({
      identifier: " ADMIN@example.com ",
      password: "correct horse battery staple",
    });
    assert.equal(getLocalSession().id, user.id);
    await assert.rejects(
      loginLocalAccount({ identifier: user.email, password: "incorrect password" }),
      /Email or password is incorrect/,
    );

    await changeLocalPassword({
      userId: user.id,
      currentPassword: "correct horse battery staple",
      newPassword: "a brand new password 123",
    });
    await assert.rejects(
      loginLocalAccount({ identifier: user.email, password: "correct horse battery staple" }),
      /Email or password is incorrect/,
    );
    assert.equal((await loginLocalAccount({
      identifier: user.email,
      password: "a brand new password 123",
    })).id, user.id);

    logoutLocalAccount();
    assert.equal(getLocalSession(), null);
    assert.equal(window.localStorage.getItem(LOCAL_SESSION_KEY), null);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("workspace data is saved per account and stale writes are rejected", async () => {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: createStorage() };
  try {
    const first = await loadWorkspace("user-1");
    assert.deepEqual(first.data, { revision: 0, data: {} });

    const saved = await saveWorkspace("user-1", { vehicles: [{ id: "VEH-1" }] }, 0);
    assert.equal(saved.data.revision, 1);
    assert.deepEqual((await loadWorkspace("user-1")).data.data.vehicles, [{ id: "VEH-1" }]);
    assert.deepEqual((await loadWorkspace("user-2")).data.data, {});

    await assert.rejects(
      saveWorkspace("user-1", { vehicles: [] }, 0),
      (error) => error.status === 409,
    );
    assert.ok(window.localStorage.getItem(`${WORKSPACE_STORAGE_PREFIX}user-1`));
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
