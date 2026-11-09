'use client'
import Runner from "@/components/runner/Runner"
import { StationHeader } from "./station-header"
import { VerdictCard } from "./verdict-card"
import { ArrivalList } from "./arrival-list"
import { Station } from "@/types/subway"
import { useNow } from "@/hooks/use-now"
import { useHydrated } from "@/hooks/use-hydrated"
import { useSettingsStore } from "@/stores/settings-store"
import { useSearchParams } from "next/navigation"
import { useArrivals } from "@/hooks/use-arrivals"
import { useShallow } from "zustand/shallow"
import { judge, WalkInput } from "@/lib/verdict"

const TEMP_WALK: WalkInput = {walkSec: 300}

export function StationView({ 
    station,
}:{
    station: Station;
}) {
    const now = useNow();
    const s = useSettingsStore(
        useShallow((s) => ({
            walkSpeed: s.walkSpeed,
            runSpeed: s.runSpeed,
            stationOverheadSec: s.stationOverheadSec,
            marginSec: s.marginSec,
        }))
    );
    const dir = useSearchParams().get("dir") === "down"
    ? "down"
    : "up";

    const query = useArrivals(station.id);
    // persist 스토어(skipHydration) 복원 전에는 기본값으로 판정하지 않도록 로딩 유지
    const hydrated = useHydrated();

    if(!hydrated || now === null || query.isPending){
        // return <StationSkeleton />
        return <h3>로딩중</h3>
    }
    if(query.isError){
        throw query.error;
    }
    const arrivals = query.data.arrivals.filter(
        (arrival) => arrival.direction === dir
    );

    const verdict = judge(arrivals, now, TEMP_WALK ,s)

    return(
        <div className="min-h-screen flex flex-col justify-between ">
            <StationHeader stationName = {station.name} lineName={station.lineName}/>
            <main className="flex flex-col flex-1 justify-between items-center mt-4">
                <VerdictCard verdict = {verdict}/>
                <div className="w-90">
                    <Runner state="rest" color={"#10B981"} />
                </div>
            </main>
            <ArrivalList/>
        </div>
    )
}