// hooks/use-arrivals.ts
"use client";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { anchorArrivals, type AnchorMap } from "@/lib/arrivals";
import type { Arrival, ArrivalObservation } from "@/types/subway";

type Anchored = { next: AnchorMap; arrivals: Arrival[] }; // anchorArrivals 반환값 그대로

export function useArrivals(stationId: string): UseQueryResult<Anchored, Error> {
    return useQuery({
        queryKey: ["arrivals", stationId],
        queryFn: async ({ queryKey, client, signal }) => {
            const res = await fetch(`/api/arrivals?id=${encodeURIComponent(stationId)}`, { signal });
            if(!res.ok){
                throw new Error(`지하철 도착 정보 요청 실패 (${res.status})`);
            }
            const obs: ArrivalObservation[] = await res.json();
            // ① fetch(`/api/arrivals?id=${encodeURIComponent(stationId)}`, { signal })
            // ② res.ok가 아니면 throw new Error(`도착 정보 요청 실패 (${res.status})`)
            // ③ const obs: ArrivalObservation[] = await res.json();
            // ④ const prev = client.getQueryData<Anchored>(queryKey)?.next ?? {};
            // ⑤ return anchorArrivals(prev, obs);
        },
        refetchInterval: 20_000,
        // refetchIntervalInBackground는 기본값(false) 그대로 — 숨은 탭은 멈춤
    });
}