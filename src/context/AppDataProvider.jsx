import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppDataContext } from "./AppDataContext.js";
import {
  DEFAULT_SERVICE_CONFIGURATION,
  DEFAULT_USER_PREFERENCES,
  EMPTY_COMPANY_DETAILS,
  normalizeInvoices,
} from "./appDataStorage.js";
import { useAuth } from "../auth/useAuth.js";
import { loadWorkspace, saveWorkspace } from "../services/workspaceApi.js";

const EMPTY_APP_DATA = {
  bookings: [],
  mechanics: [],
  inventory: [],
  inventoryTransactions: [],
  invoices: [],
  payments: [],
  companyDetails: EMPTY_COMPANY_DETAILS,
  maintenanceReminders: [],
  vehicles: [],
  serviceConfiguration: DEFAULT_SERVICE_CONFIGURATION,
  userPreferences: DEFAULT_USER_PREFERENCES,
};

function normalizeAppData(data) {
  return {
    ...EMPTY_APP_DATA,
    ...data,
    bookings: Array.isArray(data.bookings) ? data.bookings : [],
    mechanics: Array.isArray(data.mechanics) ? data.mechanics : [],
    inventory: Array.isArray(data.inventory) ? data.inventory : [],
    inventoryTransactions: Array.isArray(data.inventoryTransactions) ? data.inventoryTransactions : [],
    invoices: normalizeInvoices(data.invoices),
    payments: Array.isArray(data.payments) ? data.payments : [],
    maintenanceReminders: Array.isArray(data.maintenanceReminders) ? data.maintenanceReminders : [],
    vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
    companyDetails: { ...EMPTY_COMPANY_DETAILS, ...data.companyDetails },
    serviceConfiguration: { ...DEFAULT_SERVICE_CONFIGURATION, ...data.serviceConfiguration },
    userPreferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...data.userPreferences,
      notifications: {
        ...DEFAULT_USER_PREFERENCES.notifications,
        ...data.userPreferences?.notifications,
      },
    },
  };
}

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(EMPTY_APP_DATA);
  const [saving, setSaving] = useState(false);
  const [lastSavedState, setLastSavedState] = useState({ user: null, at: null });
  const lastSavedAt = lastSavedState.user === user ? lastSavedState.at : null;
  const [loadedUser, setLoadedUser] = useState(null);
  const [persistenceErrorState, setPersistenceErrorState] = useState({ user: null, error: "", conflict: false });
  const persistenceError = persistenceErrorState.user === user ? persistenceErrorState.error : "";
  const loading = Boolean(user && loadedUser !== user && !persistenceError);
  const workspaceLoaded = Boolean(user && loadedUser === user
    && !(persistenceErrorState.user === user && persistenceErrorState.conflict));
  const revisionRef = useRef(null);
  const activeUserIdRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const persistedSnapshotRef = useRef("");
  const dataRef = useRef(EMPTY_APP_DATA);
  const readyRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());
  const pendingSavesRef = useRef(0);

  useEffect(() => {
    let active = true;
    sessionGenerationRef.current += 1;
    readyRef.current = false;
    activeUserIdRef.current = user?.id || null;
    revisionRef.current = null;
    persistedSnapshotRef.current = "";
    if (!user) {
      dataRef.current = EMPTY_APP_DATA;
      return () => { active = false; };
    }
    loadWorkspace(user.id)
      .then(({ data: response }) => {
        if (!active) return;
        const workspaceData = normalizeAppData(response.data);
        revisionRef.current = response.revision;
        persistedSnapshotRef.current = JSON.stringify(workspaceData);
        dataRef.current = workspaceData;
        setData(workspaceData);
        readyRef.current = true;
        setLoadedUser(user);
        setPersistenceErrorState({ user, error: "", conflict: false });
      })
      .catch((error) => {
        if (active) {
          setPersistenceErrorState({
            user,
            error: `Unable to load workspace data from this browser. ${error.message || "Browser storage failed."}`,
            conflict: false,
          });
        }
      });
    return () => { active = false; };
  }, [user]);

  const updateWorkspace = useCallback((update) => {
    if (!user) return Promise.reject(new Error("Sign in before saving workspace data."));
    const userId = user.id;
    const generation = sessionGenerationRef.current;
    pendingSavesRef.current += 1;
    setSaving(true);
    const save = saveQueueRef.current.then(async () => {
      if (!readyRef.current || revisionRef.current === null || activeUserIdRef.current !== userId
          || sessionGenerationRef.current !== generation) {
        throw new Error("Workspace data is not ready. Reload the page before trying again.");
      }
      try {
        const snapshot = normalizeAppData(update(dataRef.current));
        const serializedSnapshot = JSON.stringify(snapshot);
        if (serializedSnapshot === persistedSnapshotRef.current) return dataRef.current;
        const { data: response } = await saveWorkspace(userId, snapshot, revisionRef.current);
        if (sessionGenerationRef.current !== generation || activeUserIdRef.current !== userId) {
          throw new Error("The signed-in account changed while the workspace was being saved.");
        }
        const savedData = normalizeAppData(response.data);
        revisionRef.current = response.revision;
        persistedSnapshotRef.current = JSON.stringify(savedData);
        dataRef.current = savedData;
        setData(savedData);
        setLastSavedState({ user, at: new Date().toISOString() });
        setPersistenceErrorState({ user, error: "", conflict: false });
        return savedData;
      } catch (error) {
        const conflict = error.status === 409;
        if (conflict) readyRef.current = false;
        const message = conflict
          ? "This workspace changed in another tab. Reload the page before continuing."
          : `Changes could not be saved to this browser. ${error.message || "Browser storage failed."}`;
        if (sessionGenerationRef.current === generation) {
          setPersistenceErrorState({ user, error: message, conflict });
        }
        throw new Error(message, { cause: error });
      }
    });
    saveQueueRef.current = save.catch(() => undefined);
    return save.finally(() => {
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
      setSaving(pendingSavesRef.current > 0);
    });
  }, [user]);

  const value = useMemo(() => ({
    ...data,
    updateWorkspace,
    loading,
    saving,
    lastSavedAt,
    workspaceLoaded,
    persistenceStatus: persistenceError ? "error" : loading ? "loading" : saving ? "saving" : "ready",
    persistenceError,
  }), [
    data,
    updateWorkspace,
    loading,
    saving,
    lastSavedAt,
    workspaceLoaded,
    persistenceError,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
