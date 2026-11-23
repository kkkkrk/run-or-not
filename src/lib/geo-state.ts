export type GeoState = 
    | { status: "idle" } // 권한 물어보기 전 (버튼 전)
    | { status: "locating" } // 버튼 누름 --> 권한창 + 위치를 기다리는 중
    | { status: "ok"; lat: number; lng: number; accuracy:number } 
    | { status: "denied" | "timeout" | "unavailable" | "unsupported" };

export type GeoEvent = 
    | { type: "request"} // 버튼을 누름 + 이미 허용이라 자동 시작
    | { type: "permission"; state: "denied" | "prompt"} // 열 때 물어본 권한
    | { type: "position"; lat: number; lng: number; accuracy: number}
    | { type: "error"; code: number} // 1 거부 2 사용불가 3 시간 초과
    | { type: "limit"} //직접 건 ㅌ10초 타이머가 끝남

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

export function nextGeo(prev: GeoState, e: GeoEvent): GeoState {
    switch(e.type){
        case "request":
            return {status: "locating"};
        case "permission":
            //이미 눌러서 진행 중이면 늦게 온 권한 답은 무시
            if(prev.status !== "idle") return prev;
            return e.state === "denied" ? {status: "denied"} : prev;
        case "position":
            //기다리는 중이거나 감시 중일 때만 받는다 --> 시간 제한 뒤 늦게 온 위치는 버린다
            if(prev.status !== "locating" && prev.status !== "ok") return prev;
            return { status: "ok", lat: e.lat, lng: e.lng, accuracy: e.accuracy};
        case "error":
            if(e.code === PERMISSION_DENIED) return {status: "denied"};
            if(prev.status !== "locating") return prev;
            return {status: e.code === TIMEOUT ? "timeout" : "unavailable"};
        case "limit":
            return prev.status === "locating" ? {status: "timeout"} : prev;
    }
}