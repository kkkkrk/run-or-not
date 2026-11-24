"use client";

import { useEffect, useState } from "react";
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
import { useLastStationStore } from "@/stores/last-station-store";
import { rightDirSelect, stationHref } from "@/lib/stations";
import { useRecentStore } from "@/stores/recent-store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useWalkingDistance } from "@/hooks/use-walking-time";
import { REROUTE_MOVE_M, toAutoWalk, TRACK_MOVE_M } from "@/lib/walking";
import {
    INITIAL_WALK,
    MAX_WALK_SEC,
    MIN_WALK_SEC,
    needsSync,
    nextWalk,
    stepWalkSec,
    toAskLocation,
    toLocationStep,
    toRowSource,
    toSheetLocation,
    toWalkInput,
    type WalkEvent,
} from "@/lib/walk-state";

function statusCodeOf(error: Error): string | null {
    return /\((\d{3})\)$/.exec(error.message)?.[1] ?? null;
}


export function StationScreen({ station }: { station: StationWithNext }) {
    const now = useNow();
    const hydrated = useHydrated();

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

    const requestedDir = useSearchParams().get("dir") === "down" ? "down" : "up"; // 주소가 요청한 방면
    const oppositeDir = requestedDir === "up" ? "down" : "up";
    // 요청한 방면에 이웃 역이 없으면 반대쪽을 쓴다 (결정.md 1절 L3 메모)
    const dir = station.next[requestedDir] === null && station.next[oppositeDir] !== null ? oppositeDir : requestedDir;

    const updateLastStation = useLastStationStore((s) => s.update);
    const updateRecentStation = useRecentStore((s) => s.update);
    const href = stationHref(station.id, dir); // 화면에 실제로 보이는 방면
    
    useEffect(() => {
        if(!hydrated) return;
        updateLastStation(href);
    }, [hydrated, href, updateLastStation]);
    useEffect(() => {
        if(!hydrated) return;
        updateRecentStation({stationId: station.id, direction:dir});
    }, [hydrated, station.id,dir, updateRecentStation]);
    
    const rightDir = rightDirSelect(station.subwayId);
    const query = useArrivals(station.id);

    // ── 승강장까지: 직접 고른 값 · 내 위치로 계산한 값 (L6) ──
    const [walk, setWalk] = useState(INITIAL_WALK); // 다른 역으로 가면 화면이 새로 만들어져 처음 값으로 돌아간다 (직접 입력은 이번에만)
    const send = (event: WalkEvent) => setWalk((prev) => nextWalk(prev, event));
    // 역 화면에서는 위치를 계속 따라간다(watch).
    //   지금 자리(geo.lat · lng)는 10m쯤 움직일 때마다 바뀌고, 기준점(geo.anchor)은 거기서 50m 넘게 움직였을 때만 바뀐다
    const { state: geo, request, stop } = useGeolocation({ watch: true, minMoveM: TRACK_MOVE_M, anchorMoveM: REROUTE_MOVE_M });
    const from = geo.status === "ok" ? geo.anchor : null; // T맵에 물을 출발점 = 기준점. 위치가 없으면 묻지 않는다
    const route = useWalkingDistance(station.id, from);
    // 지금 자리로 계산이 끝난 값 = 기준점에서 물은 답을 움직인 만큼 고친 것. 위치가 없거나 T맵 답을 기다리는 중이면 null
    const settled = geo.status === "ok" ? toAutoWalk(geo, station, route) : null;
    // 끝난 계산을 상태에 옮겨 적는다. 그리는 도중에 state를 바꾸면 React가 이번 그림을 버리고 곧바로 다시 그린다
    // (effect에서 옮기면 옛 값으로 한 번 그린 뒤에야 바뀐다 — React 문서 「props가 바뀔 때 state 조정하기」)
    if (settled !== null && needsSync(walk, settled)) {
        setWalk(nextWalk(walk, { type: "routed", auto: settled }));
    }

    // ── 훅에서 나온 값으로 계산 (훅은 아니지만 return보다 위에서 끝낸다) ──
    const step = toLocationStep(geo, settled); // 내 위치로 계산하는 중이면 어느 단계인지 (아니면 null)
    const input = toWalkInput(walk);           // 판정에 넣을 값. 아직 없으면 null
    const elapsedSec = now !== null && query.data !== undefined ? (now - query.dataUpdatedAt) / 1000 : 0; //마지막으로 응답을 성공적으로 받은지 몇초가 지났는지
    const arrivals = query.data?.arrivals.filter((arrival) => arrival.direction === dir) ?? []; //지금 보는 방면의 열차들
    const need = input !== null ? needSeconds(input, s) : null; //승강장까지 걸으면 몇초 뛰면 몇초
    const verdict =
        now !== null && input !== null && query.data !== undefined
            ? judge(arrivals, now, input, s)
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
        left: (rightDir === "down") ? station.next.up : station.next.down,   
        right: (rightDir === "up") ? station.next.up : station.next.down,
        selected: dir === rightDir ? "right" : "left",
        onSelect,            
    };
    const bottomNav: BottomNavProps = {
        active: "verdict",
        searchHref: "/",
        settingsHref: "/settings",
        verdictHref: href, 
    };

    // ── 3. 화면 이름 → 화면 ──
    const screen = pickScreen({
        // 위치 권한 답(unknown)을 기다리는 수십 ms도 「준비 전」 → 이미 허용한 사람에게 「승강장까지 몇 분?」이 번쩍 보이지 않는다
        ready: hydrated && now !== null && geo.status !== "unknown",
        hasData: query.data !== undefined,
        isOffline: query.fetchStatus === "paused",
        isError: query.isError,
        hasWalkTime: input !== null,
        locationStep: step,
        elapsedSec,
        noTrains: verdict?.kind === "empty",
    });

    const onRetry = () => {
        if(query.isFetching) return;
        void query.refetch();
    }

    /** 「내 위치로 계산하기」 · 「내 위치로 계산 중」 버튼 — 처음이면 브라우저가 권한을 묻는다 */
    const onUseLocation = () => {
        send({ type: "locate" });
        request();
    }
    /** 칩 · − + 로 직접 고름 — 위치는 그만 따라간다 (확인 중이었으면 그만두고, 실패 안내도 치운다) */
    const onManual = (sec: number) => {
        send({ type: "manual", sec });
        stop();
    }

    switch (screen) {
        case "loading":
            return <LoadingScreen nameplate={nameplate} locationStep={null} bottomNav={bottomNav} />;
        case "locating":
        case "routing":
            return <LoadingScreen nameplate={nameplate} locationStep={screen} bottomNav={bottomNav} />;
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
                    onSelectChip={onManual}
                    location={toAskLocation(geo)}
                    onUseLocation={onUseLocation}
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

    // pickScreen이 empty · verdict를 줬으면 도보 시간 · 판정이 반드시 있다.
    // TS는 그걸 모르니까 한 번 걸러서 알려 준다 (실제로 여기서 return되는 일은 없다)
    if (need === null || verdict === null) return null;

    // 지금 보이는 「걸으면」 값 (초). 직접 고른 값이면 그 값, 내 위치 값이면 거리로 계산한 값 — − + 는 여기서 시작한다
    const walkSec = need.walk;
    const locationFailed = geo.status === "timeout" || geo.status === "unavailable"; // 방금 위치를 못 찾았나

    const onOpenChange = (open: boolean) => {
        send({ type: "sheet", open });
        if (!open && locationFailed) stop(); // 닫으면 「위치를 찾지 못했어요」 안내를 치운다 (결정.md 1절)
    }
    const onDecrease = () => onManual(stepWalkSec(walkSec, -1));
    const onIncrease = () => onManual(stepWalkSec(walkSec, 1));

    const sheet: PlatformTimeSheetProps = {
        open: walk.open,
        onOpenChange,
        walkSec,
        runSec: need.run,
        canDecrease: walkSec > MIN_WALK_SEC,
        canIncrease: walkSec < MAX_WALK_SEC,
        onDecrease,
        onIncrease,
        onSelectChip: onManual,
        location: toSheetLocation(geo, walk, step),
        onUseLocation,
    };
    const platformTime: PlatformTimeRowProps = {
        walkSec,
        runSec: need.run,
        onPress: () => onOpenChange(!walk.open),
        sheetOpen: walk.open,
        ...toRowSource(walk), // 내 위치 값이면 줄 앞에 위치 화살표, 어림값이면 「약」
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
