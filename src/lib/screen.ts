// src/lib/screen.ts
export type Screen = "loading" | "offline" | "failed" | "ask" | "stalled" | "empty" | "verdict";

export type ScreenInput = {
    ready: boolean;        // 복원 끝 && now !== null
    hasData: boolean;      // query.data !== undefined
    isOffline: boolean;
    isError: boolean;
    hasWalkTime: boolean;
    elapsedSec: number;    // (now - dataUpdatedAt) / 1000 — 함수 밖에서 계산해서 넣음
    noTrains: boolean;
};

export function pickScreen(input: ScreenInput): Screen {
    if(!input.ready) return "loading";  //로컬스토리지에서 아직 값을 안 읽어옴
    if(!input.hasWalkTime) return "ask";
    if(!input.hasData && input.isOffline) return "offline"; // 받은 정보가 없는데 인터넷이 끊김
    if(!input.hasData && input.isError) return "failed"; // 받은 정보가 없는데 요청이 실패함
    if(!input.hasData) return "loading";
    if(input.elapsedSec >= 120) return "stalled";
    if(input.noTrains) return "empty";
    return "verdict"
}