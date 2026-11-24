// src/lib/screen.ts
export type Screen =
    | "loading"
    | "locating"  // 로딩 화면 + 「내 위치 확인 중」
    | "routing"   // 로딩 화면 + 「걷는 길 계산 중」
    | "offline"
    | "failed"
    | "ask"
    | "stalled"
    | "empty"
    | "verdict";

export type ScreenInput = {
    ready: boolean;        // 복원 끝 && now !== null && 위치 권한 답을 받음
    hasData: boolean;      // query.data !== undefined
    isOffline: boolean;
    isError: boolean;
    hasWalkTime: boolean;
    locationStep: "locating" | "routing" | null; // 내 위치로 계산하는 중이면 어느 단계인지 (walk-state.ts toLocationStep)
    elapsedSec: number;    // (now - dataUpdatedAt) / 1000 — 함수 밖에서 계산해서 넣음
    noTrains: boolean;
};

export function pickScreen(input: ScreenInput): Screen {
    if(!input.ready) return "loading";  //로컬스토리지에서 아직 값을 안 읽어옴
    // 도보 시간이 아직 없다 --> 내 위치로 계산하는 중이면 그 단계를, 아니면 「승강장까지 몇 분?」
    // (도보 시간이 이미 있으면 다시 계산하는 중이어도 판정 화면을 그대로 둔다)
    if(!input.hasWalkTime) return input.locationStep ?? "ask";
    if(!input.hasData && input.isOffline) return "offline"; // 받은 정보가 없는데 인터넷이 끊김
    if(!input.hasData && input.isError) return "failed"; // 받은 정보가 없는데 요청이 실패함
    if(!input.hasData) return "loading";
    if(input.elapsedSec >= 120) return "stalled";
    if(input.noTrains) return "empty";
    return "verdict"
}
