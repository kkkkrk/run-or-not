// src/app/api/walking/route.ts
// POST /api/walking — 본문 { stationId, from: { lat, lng } } → T맵 걷는 총거리
// 키는 서버에만 있다 (lib/api/tmap.ts는 server-only). 브라우저는 이 route만 부른다
//
// 응답 약속 (use-walking-time이 이걸 믿고 화면을 나눈다)
//   200 { distanceM }  T맵 총거리 (m)
//   400 { error }      본문이 JSON이 아니거나 모양이 틀림
//   404 { error }      모르는 역 id
//   502 { error }      T맵 실패 → 화면은 직선거리 × 1.3 + 「약」
import { fetchPedestrianRoute } from "@/lib/api/tmap";
import { getStation } from "@/lib/stations";
import { readTotalDistance, readWalkingRequest } from "@/lib/walking";
import type { WalkingErrorBody, WalkingResponse } from "@/types/walking";

function errorJson(status: 400 | 404 | 502, error: string): Response {
    return Response.json({ error } satisfies WalkingErrorBody, { status });
}

export async function POST(request: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return errorJson(400, "요청 본문이 JSON이 아니에요");
    }
    const walking = readWalkingRequest(body);
    if (walking === null) return errorJson(400, "stationId와 from(lat · lng)이 필요해요");

    const station = getStation(walking.stationId);
    if (station === undefined) return errorJson(404, "없는 역입니다.");

    let raw: unknown;
    try {
        raw = await fetchPedestrianRoute(walking.from, { lat: station.lat, lng: station.lng }, station.name);
    } catch (error) {
        // 좌표는 로그에 남기지 않는다 (누가 어디 있었는지가 된다)
        console.error("T맵 요청 실패: ", error instanceof Error ? error.message : error);
        return errorJson(502, "걷는 거리를 가져오지 못했어요");
    }
    const distanceM = readTotalDistance(raw);
    if (distanceM === null) {
        console.error("T맵 응답에 totalDistance가 없음");
        return errorJson(502, "걷는 거리를 가져오지 못했어요");
    }
    return Response.json({ distanceM } satisfies WalkingResponse);
}