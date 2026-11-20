import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type LastStationState = {
    href: string|null;
    update: (href: string) => void
};

export const useLastStationStore = create<LastStationState>()(
    persist(    
        (set) => ({
            href: null,
            update: (href:string) => set({href}),
        }),
        { name: "last-station", storage: createJSONStorage(() => sessionStorage), skipHydration: true }, // 복원(rehydrate)은 use-hydrated에서
    ),
);
