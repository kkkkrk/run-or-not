// src/hooks/use-walking-time.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import type { WalkingRequest, WalkingResponse } from "@/types/walking";

export function useWalkingDistance(station: Station, geo: GeoState) {
    // ... 기준점(anchor) 관련 코드는 6-4에서 직접 ...
    const query = useQuery({
    queryKey: [/* 6-4에서 직접 */],
    enabled: /* 6-4에서 직접 */,
    queryFn: async ({ signal }) => {
            const res = await fetch("/api/walking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationId, from: { lat, lng } } satisfies WalkingRequest),
                signal,
            });
            if(!res.ok){
                throw new Error(`도보 거리 요청 실패 (${res.status})`);
            }
            const { distanceM }: WalkingResponse = await res.json();
            return distanceM;
        },
    });
}