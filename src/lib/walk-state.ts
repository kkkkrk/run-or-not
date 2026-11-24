// src/lib/walk-state.ts
// 「승강장까지」 값의 상태 — 직접 고른 값과 내 위치로 계산한 값 가운데 무엇을 쓰는지,
// 어떤 일이 일어나면 무엇으로 바뀌는지, 그 상태를 화면 props로 어떻게 옮기는지.
// 전부 순수 함수다 (React · 브라우저 API 없음). 화면(station-screen.tsx)은 여기 함수를 부르기만 한다
import type { AskLocation, SheetLocation } from "@/types/ui";
import type { GeoState } from "./geo-state";
import type { WalkInput } from "./verdict";
import { CROSSWALK_WAIT_SEC, type AutoWalk } from "./walking";

/* ───────────── 1. 상태와 사건 ───────────── */

export type WalkState = {
    manualSec: number | null;  // 직접 고른 초 (칩 · − +). null = 직접 고르지 않음
    auto: AutoWalk | null;     // 마지막으로 끝난 「내 위치로 계산」 (지금 자리 기준). 다시 계산하는 동안에도 그대로 남는다. null = 아직 없음
    waiting: boolean;          // 「내 위치로 계산하기」를 눌러 놓고 끝나기를 기다리는 중
    open: boolean;             // 「승강장까지」 시트가 열려 있나
};

/** 역 화면에 막 들어왔을 때 — 아무 값도 없다. 다른 역으로 가면 화면이 새로 만들어져 다시 이 값부터다 */
export const INITIAL_WALK: WalkState = { manualSec: null, auto: null, waiting: false, open: false };

export type WalkEvent =
    | { type: "manual"; sec: number }     // 칩 · − + 로 직접 고름
    | { type: "locate" }                  // 「내 위치로 계산하기」 · 「내 위치로 계산 중」 버튼을 누름
    | { type: "routed"; auto: AutoWalk }  // 내 위치로 계산이 끝남 (T맵 답 · 어림 · 움직인 만큼 고친 값)
    | { type: "sheet"; open: boolean };   // 시트를 열거나 닫음

export function nextWalk(prev: WalkState, e: WalkEvent): WalkState {
    switch (e.type) {
        case "manual":
            // 직접 고르면 그 값을 쓴다. 기다리던 계산이 있었으면 없던 일로 한다 (이번에만 직접 입력 — 결정.md 1절)
            return { ...prev, manualSec: e.sec, waiting: false };
        case "locate":
            // 값은 건드리지 않는다 → 확인하는 동안에는 누르기 전 값이 그대로 보인다 (ui.ts 6절)
            return { ...prev, waiting: true };
        case "routed":
            // 버튼을 눌러 기다리던 계산이 끝남 → 내 위치 값으로 바꾸고 시트를 닫는다 (결정.md 1절)
            if (prev.waiting) return { manualSec: null, auto: e.auto, waiting: false, open: false };
            // 누르지 않았는데 끝난 계산(들어오자마자 자동 · 걸어서 자리가 바뀜) → 값만 새로 적는다. 시트는 그대로
            return { ...prev, auto: e.auto };
        case "sheet":
            return { ...prev, open: e.open };
    }
}

/* ───────────── 2. − + 한 번 ───────────── */

const STEP_SEC = 30;
export const MIN_WALK_SEC = 30;    // − 는 여기까지
export const MAX_WALK_SEC = 1800;  // + 는 여기까지 (30분)

/**
 * − + 를 한 번 눌렀을 때의 다음 값. 「지금 보이는 값」에서 시작한다.
 * 내 위치로 계산한 396초처럼 30초 단위가 아니어도 가까운 30초 눈금으로 간다: + → 420, − → 390
 */
export function stepWalkSec(sec: number, dir: -1 | 1): number {
    return dir === 1
        ? Math.floor(sec / STEP_SEC) * STEP_SEC + STEP_SEC
        : Math.ceil(sec / STEP_SEC) * STEP_SEC - STEP_SEC;
}

/* ───────────── 3. 상태 → 판정에 넣을 값 ───────────── */

/**
 * 판정(judge)에 넣을 값. 직접 고른 값이 먼저, 없으면 내 위치로 계산한 값, 둘 다 없으면 null (→ 「승강장까지 몇 분?」).
 * 내 위치 값에는 횡단보도 대기(waitSec)가 같이 간다 — 걸어도 뛰어도 똑같이 드는 시간이다.
 * 직접 고른 값은 「승강장까지 총 시간」이라 따로 더하지 않는다
 */
export function toWalkInput(walk: WalkState): WalkInput | null {
    if (walk.manualSec !== null) return { walkSec: walk.manualSec };
    if (walk.auto !== null) return { meters: walk.auto.meters, waitSec: walk.auto.crosswalks * CROSSWALK_WAIT_SEC };
    return null;
}

/** 「승강장까지」 줄이 값의 출처를 그리는 데 쓰는 값 (ui.ts PlatformTimeRowProps의 뒤쪽 반) */
export type RowSource = { source: "manual" } | { source: "location"; approximate: boolean };

export function toRowSource(walk: WalkState): RowSource {
    if (walk.manualSec === null && walk.auto !== null) {
        return { source: "location", approximate: walk.auto.approximate }; // 줄 앞에 위치 화살표, 어림값이면 「약」
    }
    return { source: "manual" };
}

/* ───────────── 4. 계산이 끝났을 때 ───────────── */

/**
 * 방금 끝난 계산(settled)을 상태에 옮겨 적어야 하나.
 * - 버튼을 눌러 기다리던 중이면 값이 전과 같아도 옮긴다 (그래야 기다림이 끝나고 시트가 닫힌다)
 * - 아니면 값이 달라졌을 때만 (같은 값을 또 적으면 화면을 끝없이 다시 그리게 된다)
 */
export function needsSync(walk: WalkState, settled: AutoWalk): boolean {
    if (walk.waiting) return true;
    return (
        walk.auto === null ||
        walk.auto.meters !== settled.meters ||
        walk.auto.approximate !== settled.approximate ||
        walk.auto.crosswalks !== settled.crosswalks
    );
}

/* ───────────── 5. 상태 → 화면 props ───────────── */

/**
 * 내 위치로 계산하는 중이면 어느 단계인가 (로딩 화면의 한 줄 · 시트 버튼의 「확인 중」).
 * settled = 지금 위치로 계산이 끝난 값. 아직이면 null
 */
export function toLocationStep(geo: GeoState, settled: AutoWalk | null): "locating" | "routing" | null {
    if (geo.status === "locating") return "locating";                 // 내 위치 확인 중
    if (geo.status === "ok" && settled === null) return "routing";    // 위치는 받았고, 걷는 길 계산 중
    return null;
}

/** 「승강장까지 몇 분?」 화면의 위치 버튼 상태 */
export function toAskLocation(geo: GeoState): AskLocation {
    switch (geo.status) {
        case "denied":
            return "denied";       // 버튼 없이 칩만 + 안내
        case "unsupported":
            return "unsupported";  // 버튼 없이 칩만 + 안내
        case "timeout":
        case "unavailable":
            return "failed";       // 버튼 · 칩 그대로 + 「위치를 찾지 못했어요…」
        case "unknown":
        case "idle":
        case "locating":           // 확인하는 동안에는 이 화면 대신 로딩 화면이 나온다 (pickScreen)
        case "ok":
            return "idle";         // 검정 버튼 「내 위치로 계산하기」
    }
}

/** 「승강장까지」 시트 맨 아래 위치 줄의 상태 */
export function toSheetLocation(
    geo: GeoState,
    walk: WalkState,
    step: "locating" | "routing" | null,
): SheetLocation {
    if (geo.status === "unsupported") return { status: "unsupported" };
    if (geo.status === "denied") return { status: "denied" };

    const byLocation = walk.manualSec === null && walk.auto !== null; // 지금 보이는 값이 내 위치로 계산한 값인가
    // 버튼을 눌러 기다리는 중 → 「내 위치 확인 중…」. source = 누르기 전 값이 어디서 왔나
    if (walk.waiting && step !== null) return { status: "locating", source: byLocation ? "location" : "manual" };

    const failed = geo.status === "timeout" || geo.status === "unavailable"; // 방금 위치를 못 찾았다
    if (walk.manualSec === null && walk.auto !== null) {
        return { status: "active", distanceM: walk.auto.meters, failed }; // 검정 면 「내 위치로 계산 중 · N m」
    }
    return { status: "idle", failed }; // 「내 위치로 계산하기」
}
