'use client'
import { useState, useSyncExternalStore, type ReactNode } from "react"
import { onlineManager } from "@tanstack/react-query"
import Link from "next/link"
import Runner from "@/components/runner/Runner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StationHeader } from "./station-header"
import { StationSkeleton } from "./station-skeleton"
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

// 마지막 성공 응답 후 경과(초) 기준. 갱신 주기 20초(use-arrivals refetchInterval)를
const STALE_NOTICE_SEC = 60;  // 3번 놓치면 판정 위에 안내
const STALE_HOLD_SEC = 120;   // 6번 놓치면 판정 보류

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

// HTTP 상태 코드. use-arrivals가 "… 요청 실패 (502)" 형식으로 던지는 메시지에서 읽는다.
// fetch 자체가 실패한 네트워크 오류는 코드가 없어서 null
function statusCodeOf(error: Error): string | null {
    return /\((\d{3})\)$/.exec(error.message)?.[1] ?? null;
}

// 오프라인·오류·판정 보류 안내 (제목 + 설명 + 버튼)
function StatusMessage({ title, detail, children }: {
    title: string;
    detail?: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {detail && <p className="text-slate-500">{detail}</p>}
            {children && <div className="mt-2 flex gap-2">{children}</div>}
        </div>
    )
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
    // 오프라인 여부. fetchStatus "paused"는 숨은 탭에서 재시도를 기다릴 때도 되므로 쓰지 않고,
    // TanStack Query가 요청을 멈출지 정할 때 보는 onlineManager를 직접 구독한다 (서버 렌더에서는 온라인으로 본다)
    const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline(), () => true);
    // persist 스토어(skipHydration) 복원 전에는 기본값으로 판정하지 않도록 로딩 유지.
    // 입력 UI도 이 뒤에 그리므로 복원 전 빈 칸이 잠깐 보였다 바뀌지 않는다
    const hydrated = useHydrated();

    // 상태 표(plan.md T7)를 위에서부터 차례로 본다
    // #1 마운트·복원 전
    if(!hydrated || now === null){
        return <StationSkeleton />
    }

    // ── 받은 데이터가 아직 없을 때 (#2~#4) ──
    // isPending·isError 대신 data로 나누는 이유: 재요청이 실패하면 data가 있어도 isError가 true가 된다
    if(query.data === undefined){
        let message: ReactNode;
        if(query.fetchStatus === "paused"){
            // #2 첫 진입이 오프라인. 요청이 멈춰 있다가 연결되면 TanStack Query가 알아서 다시 보낸다
            message = <StatusMessage title="인터넷 연결을 확인해 주세요" detail="연결되면 자동으로 불러와요" />;
        } else if(query.isError){
            // #3 첫 진입 실패 (retry 1회까지 실패한 뒤)
            const code = statusCodeOf(query.error);
            message = (
                <StatusMessage
                    title="도착 정보를 불러오지 못했어요"
                    detail={code ? `상태 코드 ${code}` : undefined}
                >
                    <Button className="h-11 px-5 text-base" onClick={() => query.refetch()}>다시 시도</Button>
                    <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5 text-base")}>
                        다른 역 찾기
                    </Link>
                </StatusMessage>
            );
        } else {
            // #4 첫 로딩 중 (retry 중 포함)
            return <StationSkeleton />
        }
        return (
            <div className="min-h-screen flex flex-col">
                <StationHeader stationName = {station.name} lineName={station.lineName}/>
                <main className="flex flex-1 items-center justify-center">{message}</main>
            </div>
        )
    }

    // ── 받은 데이터가 있을 때 (#5~#8) ──
    // dataUpdatedAt은 마지막 「성공」 응답 시각이라 재요청이 실패해도 안 바뀐다
    const elapsedSec = (now - query.dataUpdatedAt) / 1000;
    const arrivals = query.data.arrivals.filter(
        (arrival) => arrival.direction === dir
    );

    let center: ReactNode;
    let verdict: Verdict | null = null;
    if(walkMinutes === undefined || editingWalk){
        // 도보 시간이 없거나 수정 중이면 판정하지 않고 입력 UI (T6)
        center = (
            <ManualWalkInput
                stationId={station.id}
                initialMinutes={walkMinutes}
                onClose={editingWalk ? () => setEditingWalk(false) : undefined}
            />
        );
    } else if(elapsedSec > STALE_HOLD_SEC){
        // #7 오래 갱신 안 됨 → 낡은 정보로 판정하지 않는다
        center = (
            <StatusMessage title="도착 정보를 갱신하지 못해 판정을 멈췄어요">
                <Button className="h-11 px-5 text-base" disabled={query.isFetching} onClick={() => query.refetch()}>
                    다시 시도
                </Button>
            </StatusMessage>
        );
    } else {
        // #5·#6 판정 (#8 열차 0대는 VerdictCard의 empty 문구)
        verdict = judge(arrivals, now, { walkSec: walkMinutes * 60 }, s);
        center = (
            <div className="flex flex-col items-center gap-2">
                {elapsedSec > STALE_NOTICE_SEC && (
                    // #6 판정은 유지하고 작은 안내만
                    <p className="mb-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
                        {!online && "오프라인이에요 · "}최신 정보를 못 받았어요 · {Math.floor(elapsedSec)}초 전 기준
                    </p>
                )}
                <VerdictCard verdict = {verdict}/>
                <button
                    type="button"
                    className="px-3 py-2 text-sm text-slate-500"
                    onClick={() => setEditingWalk(true)}
                >
                    도보 {walkMinutes}분 기준 · <span className="underline underline-offset-2">수정</span>
                </button>
            </div>
        );
    }

    return(
        <div className="min-h-screen flex flex-col justify-between ">
            <StationHeader stationName = {station.name} lineName={station.lineName}/>
            <main className="flex flex-col flex-1 justify-between items-center mt-4">
                {center}
                <div className="w-90">
                    <Runner state={verdict === null ? "idle" : toRunnerState(verdict.kind)}color={"#10B981"} />
                </div>
            </main>
            {verdict !== null && <ArrivalList verdict={verdict} now={now} />}
        </div>
    )
}
