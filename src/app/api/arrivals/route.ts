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
    const id = request.nextUrl.searchParams.get("id"); //역 id
    if(id === null) return errorJson(404, "없는 역입니다.");
    const station = getStation(id);
    if(station === undefined) return errorJson(404, "없는 역입니다.");
    let body:unknown;
    try{
        body = await fetchRealtimeArrivals(station.apiName);
    } catch(error){
        console.error("서울시 API 요청 실패: ", error instanceof Error ? error.message : error);
        return errorJson(502, "도착 정보를 가져오지 못했어요");
    }

    const { code, message, list } = readArrivalResponse(body);
        if(code === "INFO-200") return okJson([]);

        if(code !== "INFO-000"){
            console.error(`서울시 API 오류 ${code}: ${message}`);
            return errorJson(502, "도착 정보를 가져오지 못했어요");
        }
        
            return okJson(toObservations(list, station.subwayId, Date.now()));
    
}
