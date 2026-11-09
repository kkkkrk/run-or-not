'use client'
import { useState } from "react"
import Runner from "@/components/runner/Runner"
import { StationHeader } from "./station-header"
import { VerdictCard } from "./verdict-card"
import { ArrivalList } from "./arrival-list"
import { ManualWalkInput } from "./manual-walk-input"
import { Station } from "@/types/subway"
import { useNow } from "@/hooks/use-now"
import { useHydrated } from "@/hooks/use-hydrated"
import { useSettingsStore } from "@/stores/settings-store"
import { useWalkTimeStore } from "@/stores/walk-time-store"
import { useSearchParams } from "next/navigation"
import { useArrivals } from "@/hooks/use-arrivals"
import { useShallow } from "zustand/shallow"
import { judge, Verdict } from "@/lib/verdict"
import type { RunnerState } from "@/components/runner/runnerMotion"

// 판정 → 캐릭터 동작
function toRunnerState(kind: Verdict["kind"]): RunnerState {
    switch (kind) {
        case "walk":
        case "keep-walking":
            return "walk";
        case "run":
            return "run";
        case "empty":
            return "idle";
    }
}

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
    // 이 역에 저장한 도보 시간(분). 없으면 undefined
    const walkMinutes = useWalkTimeStore((s) => s.minutesByStation[station.id]);
    const [editingWalk, setEditingWalk] = useState(false);

    const query = useArrivals(station.id);
    // persist 스토어(skipHydration) 복원 전에는 기본값으로 판정하지 않도록 로딩 유지.
    // 입력 UI도 이 뒤에 그리므로 복원 전 빈 칸이 잠깐 보였다 바뀌지 않는다
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

    // 도보 시간이 없거나 수정 중이면 판정하지 않고 입력 UI를 보여 준다
    const verdict =
        walkMinutes === undefined || editingWalk
            ? null
            : judge(arrivals, now, { walkSec: walkMinutes * 60 }, s);

    return(
        <div className="min-h-screen flex flex-col justify-between ">
            <StationHeader stationName = {station.name} lineName={station.lineName}/>
            <main className="flex flex-col flex-1 justify-between items-center mt-4">
                {verdict === null ? (
                    <ManualWalkInput
                        stationId={station.id}
                        initialMinutes={walkMinutes}
                        onClose={editingWalk ? () => setEditingWalk(false) : undefined}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <VerdictCard verdict = {verdict}/>
                        <button
                            type="button"
                            className="px-3 py-2 text-sm text-slate-500"
                            onClick={() => setEditingWalk(true)}
                        >
                            도보 {walkMinutes}분 기준 · <span className="underline underline-offset-2">수정</span>
                        </button>
                    </div>
                )}
                <div className="w-90">
                    <Runner state={verdict === null ? "idle" : toRunnerState(verdict.kind)}color={"#10B981"} />
                </div>
            </main>
            {verdict !== null && <ArrivalList verdict={verdict} now={now} />}
        </div>
    )
}