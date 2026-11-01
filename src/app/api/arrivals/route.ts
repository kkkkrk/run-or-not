// src/app/api/arrivals/route.ts
// GET /api/arrivals?id=<역 id> — 서울시 실시간 도착 API 프록시 → 관측값[]
// 키는 서버에만 있다 (lib/api/seoul-subway.ts는 server-only). 브라우저는 이 route만 부른다
//
// 응답 약속 (5-3 use-arrivals가 이걸 믿고 화면을 나눈다)
//   200 ArrivalObservation[]  정상. 운행 없음(새벽·종점 방향, INFO-200)도 빈 배열 200 → 「열차 없음」 화면
//   404 { error }             모르는 역 id → 잘못된 링크
//   502 { error }             서울시 API 실패(fetch 실패, HTTP 오류, INFO-000·INFO-200 외 코드) → 「다시 시도」
import type { NextRequest } from "next/server";
import { fetchRealtimeArrivals } from "@/lib/api/seoul-subway";
import { readArrivalResponse, toObservations } from "@/lib/arrivals";
import { getStation } from "@/lib/stations";
import type { ArrivalObservation, ArrivalsErrorBody } from "@/types/subway";

function errorJson(status: 404 | 502, error: string): Response {
    return Response.json({ error } satisfies ArrivalsErrorBody, { status });
}

function okJson(observations: ArrivalObservation[]): Response {
    return Response.json(observations);
}

export async function GET(request: NextRequest): Promise<Response> {
    const id = request.nextUrl.searchParams.get("id");

    // TODO(3-5 직접)
    // 1) id → getStation(id). id가 없거나 역이 없으면 errorJson(404, …)
    // 2) fetchRealtimeArrivals(station.apiName)을 try/catch로. 던지면(키 없음·네트워크·HTTP 오류) errorJson(502, …)
    //    서버 로그에 원인을 남기려면 catch에서 console.error
    // 3) const { code, message, list } = readArrivalResponse(body)
    //    INFO-000 → okJson(toObservations(list, station.subwayId, Date.now()))
    //    INFO-200 → okJson([])
    //    그 외   → errorJson(502, …)
    // (구현 전까지 import·도우미가 안 쓰였다는 eslint 경고가 뜬다. 다 쓰면 사라짐)
    throw new Error("TODO 3-5: /api/arrivals");
}
