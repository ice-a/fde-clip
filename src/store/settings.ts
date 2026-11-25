import { create } from "zustand";
import { invoke } from "../lib/tauri";
import type { Settings } from "../lib/types";

interface SettingsStore {
  settings: Settings | null;
  error: string;
  load: () => Promise<void>;
  save: (settings: Settings) => Promise<void>;
}

export const useSettings = create<SettingsStore>((set) => ({
  settings: null,
  error: "",
  load: async () => {
    try {
      const settings = await invoke<Settings>("settings_get");
      set({ settings, error: "" });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  save: async (settings) => {
    try {
      await invoke("settings_update", { settings });
      set({ settings, error: "" });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
