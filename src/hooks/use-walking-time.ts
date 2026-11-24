// src/hooks/use-walking-time.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import type { RouteResult } from "@/lib/walking";
import type { LatLng, WalkingRequest, WalkingResponse } from "@/types/walking";

/**
 * 기준점(from)에서 역까지 걷는 길을 우리 서버(/api/walking → T맵)에 묻는다. from이 null이면 묻지 않는다.
 * 결과는 화면이 쓰기 쉽게 셋 중 하나로 줄여서 돌려준다: 아직(pending) · 거리와 횡단보도(ok) · 못 불러옴(failed)
 */
export function useWalkingDistance(stationId: string, from: LatLng | null): RouteResult {
    const query = useQuery({
        // 키 = 「어느 역까지, 어디서」. 키가 바뀌면 새로 묻고, 같은 키면 받아 둔 답을 다시 쓴다.
        // from은 「지금 자리」가 아니라 기준점이다 — 기준점에서 REROUTE_MOVE_M 넘게 움직였을 때만 바뀐다 (geo-state.ts의 anchorMoveM)
        // → 걸음마다 T맵을 부르지 않는다. 그 사이의 움직임은 화면이 계산으로 메운다 (lib/walking.ts의 liveWalkingM)
        queryKey: ["walking", stationId, from],
        enabled: from !== null,
        queryFn: async ({ signal }) => {
            if(from === null) throw new Error("내 위치가 없어서 걷는 거리를 물을 수 없어요"); // enabled가 막아 주지만 타입을 좁히려고 한 번 더
            const res = await fetch("/api/walking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationId, from } satisfies WalkingRequest),
                signal,
            });
            if(!res.ok){
                throw new Error(`도보 거리 요청 실패 (${res.status})`);
            }
            const route: WalkingResponse = await res.json();
            return route; // { distanceM, crosswalkLeftM }
        },
        retry: 1,                     // 일시적 오류 한 번만 다시 시도 (arrivals와 같다). 그래도 실패면 화면이 직선거리 × 1.3으로 어림
        staleTime: Infinity,          // 같은 곳에서 같은 역까지 걷는 길은 그대로다 → 받은 답을 다시 묻지 않는다
        refetchOnWindowFocus: false,  // 실패한 채로 탭에 돌아올 때마다 T맵을 다시 부르지 않게 (무료 하루 1,000건)
    });

    if(query.data !== undefined) return { status: "ok", ...query.data };
    // 오프라인이면 요청이 출발도 못 하고 멈춰 있다(paused) → 기다리지 않고 못 불러온 것으로 본다. 연결되면 알아서 다시 묻는다
    if(query.isError || query.fetchStatus === "paused") return { status: "failed" };
    return { status: "pending" };
}
