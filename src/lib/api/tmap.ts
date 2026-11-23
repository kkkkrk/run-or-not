// src/lib/api/tmap.ts
// T맵 보행자 경로 — 키가 헤더에 들어가므로 서버에서만 부른다
import "server-only";
import type { LatLng } from "@/types/walking";

const ENDPOINT = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";

export async function fetchPedestrianRoute(from: LatLng, to: LatLng, toName: string): Promise<unknown> {
    const key = process.env.TMAP_APP_KEY;
    if(!key){
        throw new Error("TMAP_APP_KEY 환경 변수가 없습니다");
    }
    const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
            appKey: key,                        // 키는 주소가 아니라 헤더에
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            startX: from.lng,                   // X = 경도
            startY: from.lat,                   // Y = 위도
            endX: to.lng,
            endY: to.lat,
            startName: "내 위치",                // 판정엔 안 쓰지만 필수
            endName: toName,
            reqCoordType: "WGS84GEO",           // GPS 좌표 그대로
            resCoordType: "WGS84GEO",
        }),
        cache: "no-store",                      // 사람 · 순간마다 출발점이 달라 저장할 답이 없음
    });
    if(!res.ok){
        throw new Error(`HTTP 에러: ${res.status}`);
    }
    const data = await res.json();
    return data;                                // 가공 없이 → 총거리는 route에서 꺼낸다
}