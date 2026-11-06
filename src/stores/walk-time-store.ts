import { create } from "zustand";
import { persist } from "zustand/middleware";

type WalkingTimeState = {
    minutesByStation: Record<string, number>;
    setMinutes: (stationId: string, minutes: number) => void;
};

export const useWalkTimeStore = create<WalkingTimeState>()(
    persist(    
        (set) => ({
            minutesByStation: {},
            setMinutes: (stationId, minutes) => {
                if(!Number.isFinite(minutes) || minutes < 1 || minutes > 60){
                    return;
                }
                set((state) => ({
                    minutesByStation:{
                        ...state.minutesByStation,
                        [stationId]: minutes
                    }
                }))
            }
        }),
        { name: "ron-walk-time", skipHydration: true }, 
    ),
);