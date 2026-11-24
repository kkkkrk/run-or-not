// src/lib/geo-state.ts
// 위치 상태가 「어떤 일이 일어나면 무엇으로 바뀌는지」만 모아 둔 순수 함수.
// 브라우저 API를 부르지 않는다 → 테스트는 여기서 하고, 진짜 위치를 얻는 일은 use-geolocation.ts가 한다
import { getDistance } from "./distance";
import type { LatLng } from "@/types/walking";

export type GeoState =
    | { status: "unknown" } // 권한을 이미 줬는지 아직 모름 (브라우저의 답을 기다리는 중)
    | { status: "idle" } // 권한 물어보기 전 (버튼 전)
    | { status: "locating" } // 버튼 누름 --> 권한창 + 위치를 기다리는 중
    // lat · lng = 지금 자리(마지막으로 받아들인 위치). anchor = 기준점 — 따라갈 때 「여기서 얼마나 왔나」를 재는 자리 (역 화면은 여기서 걷는 길을 묻는다)
    | { status: "ok"; lat: number; lng: number; accuracy: number; anchor: LatLng }
    | { status: "denied" | "timeout" | "unavailable" | "unsupported" };

export type GeoEvent =
    | { type: "request"} // 버튼을 누름 + 이미 허용이라 자동 시작
    | { type: "permission"; state: "denied" | "prompt"} // 열 때 물어본 권한
    // minMoveM · anchorMoveM은 따라갈 때만 넣는다
    //   minMoveM: 지금 자리에서 이만큼 넘게 움직여야 새 위치로 본다 (작은 움직임은 GPS 흔들림일 수 있다)
    //   anchorMoveM: 기준점에서 이만큼 넘게 움직이면 기준점을 지금 자리로 옮긴다
    | { type: "position"; lat: number; lng: number; accuracy: number; minMoveM?: number; anchorMoveM?: number}
    | { type: "error"; code: number} // 1 거부 2 사용불가 3 시간 초과
    | { type: "limit"} // 직접 건 60초 안전장치가 끝남
    | { type: "stop"} // 그만 — 직접 입력으로 바꿈 · 실패 안내를 치움

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

/**
 * 이 거리(m) 안의 움직임은 진짜 움직인 것인지 알 수 없다 → 무시한다.
 * 기본은 minMoveM. 위치가 부정확하면(accuracy가 크면) 그만큼 넓힌다 — 오차 범위 안에서 튄 것일 수 있어서.
 * 그래도 anchorMoveM보다 넓히지는 않는다 (그만큼 움직였으면 부정확해도 받는다. anchorMoveM이 없으면 넓히지 않는다)
 */
function noiseM(accuracy: number, minMoveM: number, anchorMoveM: number | undefined): number {
    const widest = Math.max(minMoveM, anchorMoveM ?? minMoveM);
    return Math.min(Math.max(accuracy, minMoveM), widest);
}

export function nextGeo(prev: GeoState, e: GeoEvent): GeoState {
    switch(e.type){
        case "request":
            return {status: "locating"};
        case "permission":
            // 답을 기다리던 중일 때만 쓴다 --> 이미 눌러서 진행 중이면 늦게 온 권한 답은 무시
            if(prev.status !== "unknown") return prev;
            return e.state === "denied" ? {status: "denied"} : {status: "idle"};
        case "position": {
            //기다리는 중이거나 감시 중일 때만 받는다 --> 시간 제한 뒤 늦게 온 위치는 버린다
            if(prev.status !== "locating" && prev.status !== "ok") return prev;
            const here = {lat: e.lat, lng: e.lng};
            // 이번 시도의 첫 위치 --> 얼마나 움직였든 받고, 여기가 기준점이 된다
            if(prev.status === "locating") return { status: "ok", ...here, accuracy: e.accuracy, anchor: here};

            // ── 따라가는 중 ──
            // 1) 조금 움직인 것은 GPS 흔들림일 수 있다 --> 무시.
            //    같은 객체(prev)를 돌려주면 React는 「안 바뀜」으로 보고 화면을 다시 그리지 않는다
            if(
                e.minMoveM !== undefined &&
                getDistance(prev.lat, prev.lng, e.lat, e.lng) <= noiseM(e.accuracy, e.minMoveM, e.anchorMoveM)
            ) return prev;
            // 2) 기준점에서 anchorMoveM 안이면 기준점은 그대로 둔다 (같은 객체 --> 걷는 길을 다시 묻지 않는다).
            //    넘었으면 지금 자리가 새 기준점이다
            const keepAnchor =
                e.anchorMoveM !== undefined &&
                getDistance(prev.anchor.lat, prev.anchor.lng, e.lat, e.lng) <= e.anchorMoveM;
            return { status: "ok", ...here, accuracy: e.accuracy, anchor: keepAnchor ? prev.anchor : here};
        }
        case "error":
            if(e.code === PERMISSION_DENIED) return {status: "denied"};
            if(prev.status !== "locating") return prev;
            return {status: e.code === TIMEOUT ? "timeout" : "unavailable"};
        case "limit":
            return prev.status === "locating" ? {status: "timeout"} : prev;
        case "stop":
            // 하던 일(확인 중 · 따라가기)과 실패 안내만 치운다. 거부 · 미지원 · 아직 모름은 그대로 둔다
            switch(prev.status){
                case "locating":
                case "ok":
                case "timeout":
                case "unavailable":
                    return {status: "idle"};
                default:
                    return prev;
            }
    }
}
