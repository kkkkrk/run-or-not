"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShallow } from "zustand/shallow";
import { useNow } from "@/hooks/use-now";
import { useHydrated } from "@/hooks/use-hydrated";
import { useArrivals } from "@/hooks/use-arrivals";
import { useSettingsStore } from "@/stores/settings-store";
import { judge, needSeconds } from "@/lib/verdict";
import { pickScreen } from "@/lib/screen";
import { toTrainCard } from "@/lib/train-card";
import { getLineColor } from "@/lib/line-color";
import type { StationWithNext } from "@/types/subway";
import type {
    BottomNavProps,
    PlatformTimeRowProps,
    PlatformTimeSheetProps,
    RefreshButtonProps,
    StationNameplateProps,
} from "@/types/ui";
import { LoadingScreen } from "@/ui/station/loading-screen";
import { PlatformTimeAskScreen } from "@/ui/station/platform-time-ask-screen";
import { EmptyScreen, LoadFailedScreen, OfflineScreen, StalledScreen } from "@/ui/station/dead-end-screens";
import { VerdictScreen } from "@/ui/station/verdict-screen";

// 아직 연결 안 한 콜백 자리. 5 · 6 · 7단계에서 하나씩 진짜 함수로 바꾼다
const noop = () => {};

function statusCodeOf(error: Error): string | null {
    return /\((\d{3})\)$/.exec(error.message)?.[1] ?? null;
}


export function StationScreen({ station }: { station: StationWithNext }) {
    const now = useNow();
    const hydrated = useHydrated();

    const [open, setOpen] = useState(false);
    const SPIN_ONLY_SEC = 5;
    const [spinOnceKey, setSpinOnceKey] = useState(0);
    const [manualFetching, setManualFetching] = useState(false);
    

    const s = useSettingsStore(
        useShallow((s) => ({
            walkSpeed: s.walkSpeed,
            runSpeed: s.runSpeed,
            stationOverheadSec: s.stationOverheadSec,
            marginSec: s.marginSec,
        })),
    );
    const dir = useSearchParams().get("dir") === "down" ? "down" : "up";
    const rightDir = (station.subwayId === "1002" || station.subwayId === "1009" || station.subwayId === "1092") ? "up" : "down";
    const [walkSec, setWalkSec] = useState<number | null>(null); // null = 아직 안 고름
    const query = useArrivals(station.id);

    // ── 훅에서 나온 값으로 계산 (훅은 아니지만 return보다 위에서 끝낸다) ──
    const elapsedSec = now !== null && query.data !== undefined ? (now - query.dataUpdatedAt) / 1000 : 0; //마지막으로 응답을 성공적으로 받은지 몇초가 지났는지
    const arrivals = query.data?.arrivals.filter((arrival) => arrival.direction === dir) ?? []; //지금 보는 방면의 열차들
    const need = walkSec !== null ? needSeconds({ walkSec }, s) : null; //승강장까지 걸으면 몇초 뛰면 몇초
    const verdict =
        now !== null && walkSec !== null && query.data !== undefined
            ? judge(arrivals, now, { walkSec }, s)
            : null; 

    // ── 2. 모든 화면이 같이 쓰는 것 ──
    const onSelect = (side:"left"|"right") => {
        let dir:"up"|"down";
        if(rightDir === "up"){
            dir = (side === "right") ? "up" : "down";
        } else{
            dir = (side === "left") ? "up" : "down";
        }
        const url = new URL(window.location.href);
        url.searchParams.set("dir", dir);
        window.history.replaceState(null, "", url);
    }

    const nameplate: StationNameplateProps = {
        stationName: station.name,
        lineName: station.lineName,
        lineColor: getLineColor(station.lineName),
        left: (rightDir === "down") ? station.next.up : station.next.down,      // TODO(7단계): 왼쪽 · 오른쪽에 어느 방향을 둘지 (plan.md 7절)
        right: (rightDir === "up") ? station.next.up : station.next.down,
        selected: ((dir === "up" && rightDir === "up") || (dir === "down" && rightDir === "down")) ? "right" : "left",
        onSelect,             // TODO(7단계): ?dir 바꾸기
    };
    const bottomNav: BottomNavProps = {
        active: "verdict",
        searchHref: "/",
        settingsHref: "/settings",
        verdictHref: `/station/${station.id}`, // 임시 (L4에서 정함)
    };

    // ── 3. 화면 이름 → 화면 ──
    const screen = pickScreen({
        ready: hydrated && now !== null,
        hasData: query.data !== undefined,
        isOffline: query.fetchStatus === "paused",
        isError: query.isError,
        hasWalkTime: walkSec !== null,
        elapsedSec,
        noTrains: verdict?.kind === "empty",
    });

    const onRetry = () => {
        if(query.isFetching) return;
        void query.refetch();
    }

    switch (screen) {
        case "loading":
            return <LoadingScreen nameplate={nameplate} locationStep={null} bottomNav={bottomNav} />;
        case "offline":
            return <OfflineScreen nameplate={nameplate} bottomNav={bottomNav} />;
        case "failed":
            return (
                <LoadFailedScreen
                    nameplate={nameplate}
                    statusCode={statusCodeOf(query.error as Error)}
                    onRetry = {onRetry}     
                    bottomNav={bottomNav}
                />
            );
        case "ask":
            return (
                <PlatformTimeAskScreen
                    nameplate={nameplate}
                    onSelectChip={setWalkSec} // 이것만 처음부터 진짜 — 칩을 눌러야 판정 화면으로 넘어간다
                    location="hidden"
                    onUseLocation={noop}
                    bottomNav={bottomNav}
                />
            );
        case "stalled":
            return (
                <StalledScreen
                    nameplate={nameplate}
                    refreshing={query.isFetching}  
                    onRefresh={onRetry}    
                    bottomNav={bottomNav}
                />
            );
        case "empty":
        case "verdict":
            break; // 둘은 재료(승강장까지 줄 · 시트)가 같아서 아래에서 같이 만든다
    }

    // pickScreen이 empty · verdict를 줬으면 walkSec · 판정이 반드시 있다.
    // TS는 그걸 모르니까 한 번 걸러서 알려 준다 (실제로 여기서 return되는 일은 없다)
    if (walkSec === null || need === null || verdict === null) return null;

    
    const onOpenChange = () => {
        setOpen((prev)=> !prev);
    } 
    const onDecrease = () => {
        setWalkSec((prev)=>{
            if(prev === null) return prev;
            return Math.ceil(prev / 30) * 30 - 30;
        })
    }

    const onIncrease = () => {
        setWalkSec((prev)=>{
            if(prev === null) return prev;
            return Math.floor(prev / 30) * 30 + 30;
        })
    }

    const onSelectChip = (sec: number):void => {
        setWalkSec(sec);
    }

    const sheet: PlatformTimeSheetProps = {
        open,            
        onOpenChange,     
        walkSec,
        runSec: need.run,
        canDecrease: walkSec > 30,    
        canIncrease: walkSec < 1800,
        onDecrease,
        onIncrease,
        onSelectChip,
        location: { status: "hidden" },
        onUseLocation: noop,        //Todo: L6
    };
    const platformTime: PlatformTimeRowProps = {
        walkSec,
        runSec: need.run,
        onPress: onOpenChange, 
        sheetOpen: open,       
        source: "manual",
    };

    if (verdict.kind === "empty") {
        return <EmptyScreen nameplate={nameplate} platformTime={platformTime} sheet={sheet} bottomNav={bottomNav} />;
    }

    const onRefresh = () => {
        if(query.isFetching) return;
        if(Date.now() - query.dataUpdatedAt < SPIN_ONLY_SEC * 1000){
            setSpinOnceKey((prev) => prev + 1);
            return;
        }
        setManualFetching(true);
        void query.refetch().finally(() => {setManualFetching(false)})
    }

    const refresh: RefreshButtonProps = {
        elapsedSec,
        stale: elapsedSec >= 60,
        refreshing: manualFetching && query.isFetching,      
        spinOnceKey,         
        onRefresh,        
    };

    return (
        <VerdictScreen
            nameplate={nameplate}
            verdict={verdict.kind}
            card={{ platformTime, refresh, ...toTrainCard(verdict) }}
            sheet={sheet}
            bottomNav={bottomNav}
        />
    );
}