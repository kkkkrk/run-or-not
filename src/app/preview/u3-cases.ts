import type { AskLocation, SheetLocation, TrainRow } from "@/types/ui";
import { KONKUK, type Station, type Trains, type Verdict } from "./u2-cases";

/*
 * U3 미리보기의 가짜 데이터와 가짜 계산 (plan.md U3 5)). 여기 있는 것은 전부 미리보기에서만 쓴다.
 *
 * 숫자는 design/v32.html의 그림(스크립트 4절 「눌러지는 판정 화면」 · 6절 WAIT)과 같게 맞췄다.
 * 콜백과 가짜 상태(시트 열림 · 고른 시간)는 여기 없고 u3-screens.tsx에 있다.
 * 호선 색(lineColor)은 결정.md 2절 「호선 색」 표의 값이다 (U6에서 옛 공식 색을 바꿨다).
 */

/* ───────────────────────── 역 ───────────────────────── */

/** 건대입구에서 왼쪽(어린이대공원 방면)을 고른 상태 → 반대 방면은 오른쪽(자양) */
const KONKUK_LEFT: Station = { ...KONKUK, selected: "left" };

/** 끝 역: 오금은 오른쪽 이웃이 없다 → 「열차가 없어요」에 반대 방면 버튼이 없다 */
const OGEUM: Station = {
    stationName: "오금",
    lineName: "3호선",
    lineColor: "#FF8939",
    left: "경찰병원",
    right: null,
    selected: "left",
};

/** 반대 방면 이름이 가장 긴 경우: 신당에서 오른쪽(상왕십리)을 고르면 반대쪽은 9자 「동대문역사문화공원」 */
const SINDANG: Station = {
    stationName: "신당",
    lineName: "2호선",
    lineColor: "#3CB44A",
    left: "동대문역사문화공원",
    right: "상왕십리",
    selected: "right",
};

/** 긴 역명 (9자) — 흰 화면의 역명판 */
const DDP: Station = {
    stationName: "동대문역사문화공원",
    lineName: "2호선",
    lineColor: "#3CB44A",
    left: "을지로4가",
    right: "신당",
    selected: "right",
};

/* ───────────────────────── 화면 한 장 ───────────────────────── */

type Common = {
    id: string;        // 주소에 쓰는 이름 — /preview?screen=이 값
    name: string;      // 보드 제목
    note: string;      // 무엇을 보는 장인지
    small?: boolean;   // true면 375 × 667, 아니면 390 × 844
    station?: Station; // 없으면 건대입구
};

/**
 * 「승강장까지」 시트가 붙는 화면 (판정 화면 · 열차가 없어요). 미리보기의 가짜 상태로 열고 닫히고, ± · 칩으로 값이 바뀐다.
 * 여기 값은 처음 상태다
 */
export type SheetCase = Common & {
    kind: "sheet";
    screen: "verdict" | "empty";
    open: boolean;      // 처음에 시트가 열려 있는지
    walkSec: number;    // 처음 값 (승강장까지 걸어서)
    runSec?: number;    // 처음 뛰면 값. 없으면 가짜 계산(fakeRunSec)으로 구한다. ± · 칩을 누른 뒤에는 늘 가짜 계산
    location?: SheetLocation; // 처음 위치 줄 상태 (U7). 없으면 hidden — 위치 기능을 붙이기 전의 모습.
                              // active(또는 source가 location인 locating)면 「승강장까지」 줄에 화살표가 붙고 시트에 칠한 칩이 없다
};

export type AskCase = Common & { kind: "ask"; location: AskLocation };
export type FailedCase = Common & { kind: "failed"; statusCode: string | null };
export type OfflineCase = Common & { kind: "offline" };
export type StalledCase = Common & { kind: "stalled"; refreshing: boolean };
export type LoadingCase = Omit<Common, "station"> & {
    kind: "loading";
    station: Station | null;
    step?: "locating" | "routing"; // 위치 · 걷는 길을 확인하는 중 (U7). 없으면 그냥 로딩
};

export type U3Case = SheetCase | AskCase | FailedCase | OfflineCase | StalledCase | LoadingCase;

/* ───────────────────────── 1. 「승강장까지」 시트 ───────────────────────── */

/** 내 위치로 계산한 값: 승강장까지 420m → 396초 · 228초. 10초 단위로 반올림해 6분 40초 · 3분50초로 보인다 (v32 「위치가 부정확할 때」의 거리) */
const BY_LOCATION = { walkSec: 396, runSec: 228, location: { status: "active", distanceM: 420, failed: false } } as const;

/**
 * 눌러 보기에서 「내 위치로 계산하기」를 눌렀을 때 나오는 가짜 결과 — v39 「승강장까지」 묶음의 값:
 * 승강장까지 150m → 걸으면 150 ÷ 1.25 + 60 = 180초 · 뛰면 150 ÷ 2.5 + 60 = 120초
 */
export const FAKE_LOCATED = { walkSec: 180, runSec: 120, distanceM: 150 };
const LOCATED = { walkSec: FAKE_LOCATED.walkSec, runSec: FAKE_LOCATED.runSec } as const;

export const SHEET_CASES: SheetCase[] = [
    {
        kind: "sheet",
        id: "sheet-demo",
        name: "눌러 보기 — 닫힌 채로 시작",
        note: "「승강장까지」 줄을 누르면 올라오고, 완료 · Esc · 시트 바깥으로 닫혀요",
        screen: "verdict",
        open: false,
        walkSec: 180,
    },
    {
        kind: "sheet",
        id: "sheet-open",
        name: "열린 모습 — 칩 값 (3분)",
        note: "고른 칩은 검정 면 + 흰 글자 · 시트가 카드와 캡슐을 덮고 판정 글자 · 캐릭터는 보임",
        screen: "verdict",
        open: true,
        walkSec: 180,
    },
    {
        kind: "sheet",
        id: "sheet-between",
        name: "칩에 없는 값 (3분 30초)",
        note: "칠한 칩 없음 · 큰 숫자는 숫자 크게 + 단위 작게, 분과 초 사이 8px",
        screen: "verdict",
        open: true,
        walkSec: 210,
    },
    {
        kind: "sheet",
        id: "sheet-location",
        name: "내 위치로 계산한 값",
        note: "396초 → 「6분 40초」(10초 반올림) · 칠한 칩 없음 · 검정 버튼 「내 위치로 계산 중 · 420m」",
        screen: "verdict",
        open: true,
        ...BY_LOCATION,
    },
    {
        kind: "sheet",
        id: "sheet-min",
        name: "가장 작은 값 (30초)",
        note: "−가 꺼짐 (canDecrease: false) — 흐려지고 눌러도 그대로, 포커스는 남음",
        screen: "verdict",
        open: true,
        walkSec: 30,
    },
    {
        kind: "sheet",
        id: "sheet-max",
        name: "가장 큰 값 (60분)",
        note: "+가 꺼짐 (canIncrease: false) · 줄이 셋인 카드는 시트보다 높지만, 열려 있는 동안 카드를 숨겨서 시트 위로 안 남음",
        screen: "verdict",
        open: true,
        walkSec: 3600,
    },
    {
        kind: "sheet",
        id: "sheet-empty",
        name: "열차가 없어요 + 시트",
        note: "「열차가 없어요」 화면도 같은 시트를 그림",
        screen: "empty",
        open: true,
        walkSec: 300,
    },
    {
        kind: "sheet",
        id: "sheet-small",
        name: "작은 화면 375 × 667",
        note: "시트 높이는 그대로 300px — 판정 글자 · 캐릭터가 그 위로 보이는지",
        small: true,
        screen: "verdict",
        open: true,
        walkSec: 180,
    },
];

/** 시트의 위치 줄 (U7) — 앞의 다섯 장은 v39 「승강장까지」 묶음의 그림과 같은 값이다 */
export const SHEET_LOCATION_CASES: SheetCase[] = [
    {
        kind: "sheet",
        id: "sheet-auto",
        name: "자동 — 내 위치로 계산 중",
        note: "v39 「승강장까지를 눌렀을 때」 · 버튼이 검정 「내 위치로 계산 중 · 150m」, 고른 칩 없음. 다시 누르면 새로 계산",
        screen: "verdict",
        open: true,
        ...LOCATED,
        location: { status: "active", distanceM: 150, failed: false },
    },
    {
        kind: "sheet",
        id: "sheet-once",
        name: "칩을 고른 뒤 — 이번만 직접 입력",
        note: "v39 「칩을 고른 뒤」 · 5분 칩이 검정, 버튼은 다시 「내 위치로 계산하기」 · 뒤 화면의 화살표가 사라짐",
        screen: "verdict",
        open: true,
        walkSec: 300,
        location: { status: "idle", failed: false },
    },
    {
        kind: "sheet",
        id: "sheet-idle",
        name: "위치를 안 쓸 때 — 눌러 보기",
        note: "v39 「위치를 안 쓸 때」 · 버튼을 누르면 「내 위치 확인 중…」 → 1.2초 뒤 계산이 끝나며 시트가 닫힘 (가짜)",
        screen: "verdict",
        open: true,
        walkSec: 180,
        location: { status: "idle", failed: false },
    },
    {
        kind: "sheet",
        id: "sheet-denied",
        name: "위치를 거부했을 때",
        note: "v39 「위치를 거부했을 때」 · 버튼 대신 안내 한 줄",
        screen: "verdict",
        open: true,
        walkSec: 180,
        location: { status: "denied" },
    },
    {
        kind: "sheet",
        id: "sheet-locating",
        name: "내 위치 확인 중 — 직접 고른 값에서",
        note: "버튼이 보조색 「내 위치 확인 중…」 · 눌러도 그대로 · 누르기 전 값이 직접 고른 값이라 3분 칩은 칠한 채",
        screen: "verdict",
        open: true,
        walkSec: 180,
        location: { status: "locating", source: "manual" },
    },
    {
        kind: "sheet",
        id: "sheet-locating-again",
        name: "내 위치 확인 중 — 다시 계산",
        note: "검정 버튼을 다시 누른 뒤 · 누르기 전 값이 위치로 계산한 값이라 칠한 칩이 없음",
        screen: "verdict",
        open: true,
        ...LOCATED,
        location: { status: "locating", source: "location" },
    },
    {
        kind: "sheet",
        id: "sheet-failed",
        name: "위치를 못 찾았을 때 — 직접 입력 중",
        note: "버튼 그대로 + 아래 한 줄 · 시트가 한 줄만큼 커짐(약 320px) · ± · 칩을 누르거나 닫으면 사라짐 (가짜)",
        screen: "verdict",
        open: true,
        walkSec: 180,
        location: { status: "idle", failed: true },
    },
    {
        kind: "sheet",
        id: "sheet-auto-failed",
        name: "위치를 못 찾았을 때 — 자동이었으면",
        note: "값이 여전히 위치로 계산한 값이라 검정 버튼 · 화살표는 그대로 + 아래 한 줄",
        screen: "verdict",
        open: true,
        ...LOCATED,
        location: { status: "active", distanceM: 150, failed: true },
    },
    {
        kind: "sheet",
        id: "sheet-unsupported",
        name: "위치를 쓸 수 없는 브라우저",
        note: "거부했을 때와 같은 자리에 「이 브라우저에서는 위치를 쓸 수 없어요」",
        screen: "verdict",
        open: true,
        walkSec: 180,
        location: { status: "unsupported" },
    },
    {
        kind: "sheet",
        id: "sheet-far",
        name: "먼 거리 — km로 쓸 때",
        note: "1240m → 「내 위치로 계산 중 · 1.2km」",
        screen: "verdict",
        open: true,
        walkSec: 1052,
        runSec: 556,
        location: { status: "active", distanceM: 1240, failed: false },
    },
    {
        kind: "sheet",
        id: "sheet-auto-failed-small",
        name: "가장 높은 시트 — 375 × 667",
        note: "버튼 + 한 줄(약 320px)일 때 판정 글자 · 캐릭터가 그 위로 보이는지",
        small: true,
        screen: "verdict",
        open: true,
        ...LOCATED,
        location: { status: "active", distanceM: 150, failed: true },
    },
    {
        kind: "sheet",
        id: "sheet-empty-auto",
        name: "열차가 없어요 + 자동",
        note: "「열차가 없어요」 화면의 시트에도 같은 위치 줄",
        screen: "empty",
        open: true,
        ...LOCATED,
        location: { status: "active", distanceM: 150, failed: false },
    },
];

/* ───────────────────────── 2. 「승강장까지 몇 분?」 ───────────────────────── */

export const ASK_CASES: AskCase[] = [
    {
        kind: "ask",
        id: "ask",
        name: "승강장까지 몇 분?",
        note: "location: hidden — 위치 기능을 붙이기 전(U7 · L6 전)의 모습. 칩만",
        location: "hidden",
    },
    {
        kind: "ask",
        id: "ask-or",
        name: "위치 버튼 + 「또는 직접 고르기」",
        note: "location: idle — v39 「승강장까지 몇 분?」 그림. 검정 버튼을 누르면 콘솔에 onUseLocation()",
        location: "idle",
    },
    {
        kind: "ask",
        id: "ask-failed",
        name: "위치를 못 찾았을 때",
        note: "location: failed — 버튼 · 칩 그대로 + 카드 아래 한 줄 (시간 초과 · 사용 불가)",
        location: "failed",
    },
    {
        kind: "ask",
        id: "ask-denied",
        name: "거부했을 때",
        note: "location: denied — v39 「거부했을 때」 그림. 버튼 없이 칩만 + 안내 한 줄",
        location: "denied",
    },
    {
        kind: "ask",
        id: "ask-unsupported",
        name: "위치를 쓸 수 없는 브라우저",
        note: "location: unsupported — 거부와 같은 모양에 문구만 다름",
        location: "unsupported",
    },
    {
        kind: "ask",
        id: "ask-long",
        name: "긴 역명",
        note: "흰 화면의 역명판 (9자 → 한 단계 작게)",
        station: DDP,
        location: "hidden",
    },
    {
        kind: "ask",
        id: "ask-small",
        name: "작은 화면 375 × 667",
        note: "제목이 한 줄인지",
        small: true,
        location: "hidden",
    },
    {
        kind: "ask",
        id: "ask-failed-small",
        name: "못 찾았을 때 — 375 × 667",
        note: "버튼 + 칩 + 안내 한 줄이 캡슐 위에 다 들어가는지 (v39 작은 화면 그림에 한 줄을 더한 것)",
        small: true,
        location: "failed",
    },
];

/* ───────────────────────── 3. 막다른 화면 4종 ───────────────────────── */

/** 가까운 역: 걸으면 3분20초 · 뛰면 1분50초 (v32 NEAR — v32 「열차가 없어요」 그림과 같은 숫자) */
const NEAR = { walkSec: 200, runSec: 110 };

/** 열차가 없어요 — 「승강장까지」 줄을 누르면 시트가 열리므로 시트 화면과 같은 모양의 데이터다 (닫힌 채로 시작) */
export const EMPTY_CASES: SheetCase[] = [
    {
        kind: "sheet",
        id: "empty",
        name: "열차가 없어요",
        note: "반대 방면이 왼쪽 칸 → 「‹ 어린이대공원 방면 보기」 (v32 그림)",
        screen: "empty",
        open: false,
        ...NEAR,
    },
    {
        kind: "sheet",
        id: "empty-right",
        name: "열차가 없어요 — 반대 방면이 오른쪽",
        note: "꺾쇠가 글자 뒤로 → 「자양 방면 보기 ›」",
        station: KONKUK_LEFT,
        screen: "empty",
        open: false,
        ...NEAR,
    },
    {
        kind: "sheet",
        id: "empty-end",
        name: "열차가 없어요 — 끝 역",
        note: "반대쪽 이웃이 없어 버튼을 숨기고 문구만",
        station: OGEUM,
        screen: "empty",
        open: false,
        ...NEAR,
    },
    {
        kind: "sheet",
        id: "empty-long",
        name: "열차가 없어요 — 긴 방면 이름",
        note: "375 × 667 · 「동대문역사문화공원 방면 보기」가 한 줄인지",
        small: true,
        station: SINDANG,
        screen: "empty",
        open: false,
        ...NEAR,
    },
];

export const DEAD_END_CASES: (FailedCase | OfflineCase | StalledCase)[] = [
    {
        kind: "failed",
        id: "failed",
        name: "불러오기 실패 — 상태 코드 있음",
        note: "「다른 역 찾기」 아래 작은 글자 「상태 코드 502」",
        statusCode: "502",
    },
    {
        kind: "failed",
        id: "failed-no-code",
        name: "불러오기 실패 — 코드 없음",
        note: "네트워크 오류(statusCode: null)면 상태 코드 줄이 없음",
        statusCode: null,
    },
    { kind: "offline", id: "offline", name: "오프라인", note: "두 줄 제목(한 단계 작게) + 설명 · 버튼 없음" },
    {
        kind: "stalled",
        id: "stalled",
        name: "판정 멈춤",
        note: "받은 지 120초 이상 · 두 줄 제목 · 설명 없이 「다시 받기」",
        refreshing: false,
    },
    {
        kind: "stalled",
        id: "stalled-busy",
        name: "판정 멈춤 — 다시 받는 중",
        note: "refreshing: true → 버튼의 ↻가 0.7초에 한 바퀴",
        refreshing: true,
    },
    {
        kind: "failed",
        id: "failed-small",
        name: "불러오기 실패 — 375 × 667",
        note: "막다른 화면 가운데 내용이 가장 많은 장",
        small: true,
        statusCode: "502",
    },
    {
        kind: "offline",
        id: "offline-small",
        name: "오프라인 — 375 × 667",
        note: "두 줄 제목 + 설명",
        small: true,
    },
];

/* ───────────────────────── 4. 로딩 ───────────────────────── */

export const LOADING_CASES: LoadingCase[] = [
    {
        kind: "loading",
        id: "loading",
        name: "로딩",
        note: "판정 글자 자리 · 열차 카드 스켈레톤 · 캐릭터 없음",
        station: KONKUK,
    },
    {
        kind: "loading",
        id: "loading-unknown",
        name: "로딩 — 역을 모를 때",
        note: "nameplate: null → 역명판 자리에 같은 크기 알약 스켈레톤 (48px · 위 7 · 좌우 12px)",
        station: null,
    },
    {
        kind: "loading",
        id: "loading-small",
        name: "로딩 — 375 × 667",
        note: "",
        small: true,
        station: KONKUK,
    },
    {
        kind: "loading",
        id: "loading-locating",
        name: "내 위치 확인 중",
        note: "locationStep: locating — 스켈레톤 아래 한 줄 + 서 있는 캐릭터 (위치를 이미 허용한 채 역에 들어왔을 때)",
        station: KONKUK,
        step: "locating",
    },
    {
        kind: "loading",
        id: "loading-routing",
        name: "걷는 길 계산 중",
        note: "locationStep: routing — v39 「위치 · 걷는 길 확인 중」 그림",
        station: KONKUK,
        step: "routing",
    },
    {
        kind: "loading",
        id: "loading-routing-small",
        name: "걷는 길 계산 중 — 375 × 667",
        note: "",
        small: true,
        station: KONKUK,
        step: "routing",
    },
];

/** 주소(?screen=…)로 한 장만 크게 볼 때 찾는 목록 */
export const U3_CASES: U3Case[] = [
    ...SHEET_CASES,
    ...SHEET_LOCATION_CASES,
    ...ASK_CASES,
    ...EMPTY_CASES,
    ...DEAD_END_CASES,
    ...LOADING_CASES,
];

/** 주소의 이름이 U3 화면인지 — page.tsx가 U2 · U3 가운데 어느 묶음에서 찾을지 정할 때 쓴다 */
export const isU3Screen = (id: string) => U3_CASES.some((c) => c.id === id);

/* ───────────────────────── 가짜 계산 (실제 계산은 영준의 로직 — L1 · L3) ───────────────────────── */

/** 가짜 입력 범위: 30초 ~ 60분 (plan.md 2절의 제안값. L3에서 확정) */
export const WALK_MIN = 30;
export const WALK_MAX = 3600;

/** 직접 고른 값의 뛰면: 역 안 이동 60초는 그대로, 나머지는 걷기 4.5 ÷ 뛰기 9.0 = 절반 (v32 스크립트 4절) */
export const fakeRunSec = (walkSec: number) => (walkSec <= 60 ? walkSec : 60 + (walkSec - 60) / 2);

/** − 30초 · + 30초: 30초 눈금에 맞춰 옮긴다 (396초에서 −를 누르면 390초) */
export const fakeDecrease = (walkSec: number) => Math.max(WALK_MIN, Math.floor((walkSec - 1) / 30) * 30);
export const fakeIncrease = (walkSec: number) => Math.min(WALK_MAX, Math.floor(walkSec / 30) * 30 + 30);

/** 그림용 열차 두 대: 2분30초 · 8분40초 뒤 도착 (v32 TRAINS) */
const TRAIN_REMAINING = [150, 520];

/**
 * 가짜 판정 — 시트에서 값을 바꾸면 뒤 판정이 바로 바뀌는 것을 보여 주려고 v32의 계산을 그대로 옮겼다.
 * (천천히 180초 · 여유 30초 · 아슬아슬 ±20초. 진짜 판정은 src/lib/verdict.ts이고 미리보기는 그 파일을 쓰지 않는다)
 */
export function fakeJudge(walkSec: number, runSec: number): { verdict: Verdict; trains: Trains; pending: boolean } {
    const kindOf = (remaining: number): TrainRow["kind"] => {
        if (remaining >= walkSec + 180) return "slow";
        if (remaining >= walkSec + 30) return "walk";
        if (remaining >= runSec + 20) return "run";
        if (remaining >= runSec - 20) return "tight";
        return "miss";
    };

    const kinds = TRAIN_REMAINING.map(kindOf);
    const targetIndex = kinds.findIndex((kind) => kind !== "miss");
    const target = kinds[targetIndex];

    const rows = TRAIN_REMAINING.map((remainingSec, index): TrainRow => {
        const kind = kinds[index];
        return kind === "miss"
            ? { kind, remainingSec, shortBySec: runSec - remainingSec }
            : { kind, remainingSec, isTarget: index === targetIndex };
    });
    const [first, ...rest] = rows;
    const trains: Trains = [first, ...rest];

    // 탈 수 있는 열차가 없으면 「탈 열차가 아직 안 보여요」 + 대기 줄
    if (target === undefined || target === "miss") return { verdict: "keep-walking", trains, pending: true };
    return { verdict: target, trains, pending: false };
}
