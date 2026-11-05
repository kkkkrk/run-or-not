// stores/settings-store.ts   ('use client' 필요 없음)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VerdictSettings } from "@/lib/verdict";

// 기본값은 여기 한 곳에만. 숫자는 초안 — 8단계에서 직접 걸어 보고 확정 (컨텍스트 12절)
export const DEFAULT_SETTINGS: VerdictSettings = {
  walkSpeed: 1.3,          // m/s
  runSpeed: 3.0,           // m/s
  stationOverheadSec: 60,  // 입구 → 승강장
  marginSec: 30,           // 걸어도 돼 여유
};

type SettingsState = VerdictSettings & {
    update: (patch: Partial<VerdictSettings>) => void;
    reset: () => void;
};

export const useSettingsStore = create<SettingsState>()(
    persist(    
        (set) => ({
            ...DEFAULT_SETTINGS,
            update: (patch) => set(patch),
            reset: () => set(DEFAULT_SETTINGS),
        }),
        { name: "ron-settings", skipHydration: true }, // 복원(rehydrate)은 5-4 use-hydrated에서
    ),
);