
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthContext } from "./AuthContext.js";

import {
  getLocalSession,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
} from "../services/localAuth.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [sessionError, setSessionError] =
    useState("");

  useEffect(() => {
    let active = true;

    function checkSession() {
      try {
        if (active) {
          setUser(getLocalSession());
          setSessionError("");
        }
      } catch (error) {
        if (!active) return;
        setUser(null);
        setSessionError(error.message || "Unable to read local sign-in data.");
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function login({ identifier, password }) {
    setSessionError("");
    try {
      const signedInUser = await loginLocalAccount({ identifier, password });
      setUser(signedInUser);
      return signedInUser;
    } catch (error) {
      setUser(null);
      throw new Error(error.message || "Unable to sign in.");
    }
  }

  async function register(account) {
    await registerLocalAccount(account);
  }

  async function logout() {
    logoutLocalAccount();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      checkingSession,
      sessionError,
      login,
      register,
      logout,
    }),
    [user, checkingSession, sessionError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
