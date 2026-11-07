export const WORKSPACE_STORAGE_PREFIX = "autocare-workspace:v1:";

function getWorkspaceKey(userId) {
  return `${WORKSPACE_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function readWorkspace(userId) {
  const storage = window.localStorage;
  const key = getWorkspaceKey(userId);
  const raw = storage.getItem(key);
  if (raw !== null) {
    const workspace = JSON.parse(raw);
    if (!Number.isInteger(workspace.revision) || workspace.revision < 0
        || !workspace.data || typeof workspace.data !== "object" || Array.isArray(workspace.data)) {
      throw new Error("Local workspace data is invalid. Export your browser data before clearing it.");
    }
    return workspace;
  }

  const workspace = { revision: 0, data: {} };
  storage.setItem(key, JSON.stringify(workspace));
  return workspace;
}

export async function loadWorkspace(userId) {
  const workspace = readWorkspace(userId);
  return { data: workspace };
}

export async function saveWorkspace(userId, data, revision) {
  const storage = window.localStorage;
  const key = getWorkspaceKey(userId);
  const current = readWorkspace(userId);
  if (current.revision !== revision) {
    const error = new Error("Workspace data changed in another tab. Reload the page before saving again.");
    error.status = 409;
    throw error;
  }

  const workspace = { revision: current.revision + 1, data };
  storage.setItem(key, JSON.stringify(workspace));
  return { data: workspace };
}
