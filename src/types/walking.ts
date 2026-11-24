// src/types/walking.ts
export type LatLng = { lat: number; lng: number };
export type WalkingRequest = { stationId: string; from: LatLng };  // 브라우저 → /api/walking
export type WalkingResponse = {                                    // 200
    distanceM: number;          // T맵 총거리 (m)
    crosswalkLeftM: number[];   // 횡단보도마다 「다 건넌 뒤 역까지 남는 거리(m)」. 길 순서대로. 역 앞 횡단보도는 빠져 있다 (lib/walking.ts)
};
export type WalkingErrorBody = { error: string };                  // 400 · 404 · 502
