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
            const prev = client.getQueryData<Anchored>(queryKey)?.next ?? {};
            return anchorArrivals(prev, obs);
        },
        refetchInterval: 20_000,
        retry: 1,           // 기본 3회면 실패 화면이 늦게 뜸. 일시적 오류 한 번만 다시 시도
        staleTime: 10_000,  // 화면 복귀·재마운트 때 10초 안에 받은 데이터면 다시 요청하지 않음
    });
}