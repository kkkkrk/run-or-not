import { Direction } from "@/types/subway";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 5;

type stationType = {
    stationId:string;
    direction:Direction;
}
type RecentState = {
    stations:stationType[];
    update: (station:stationType) => void;
};

export const useRecentStore = create<RecentState>()(
    persist(    
        (set) => ({
            stations:[],
            update: (station:stationType) => 
                set((prev)=>({
                    stations:  [ station, ...prev.stations]
                        .filter((station, index, arr) => 
                            arr.findIndex((s)=> s.stationId === station.stationId) === index
                        ).slice(0, MAX_RECENT)
                })),
        }),
        { name: "recent-station", skipHydration: true }, 
    ),
);
