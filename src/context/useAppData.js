import { useContext } from "react";
import { AppDataContext } from "./AppDataContext.js";

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider.");
  }
  return context;
}
