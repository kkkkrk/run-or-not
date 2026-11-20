import type { BottomNavProps, ScreenTone, SettingItem, SettingKey, SettingPosition } from "@/types/ui";
import { BOTTOM_NAV } from "./kit";

/*
 * U5 미리보기의 가짜 데이터와 가짜 계산 (plan.md U5 4)). 여기 있는 것은 전부 미리보기에서만 쓴다.
 *
 * 숫자는 design/v32.html 스크립트 5절(DEF · IT)과 같게 맞췄다 — 단계 값, − + 한 번에 움직이는 양, 범위.
 * 범위는 아직 정해지지 않은 예시 값이다 (plan.md 7절 「L4 전에 정할 것」). 실제 값과 계산은 영준의 로직(L4)이 한다.
 * 콜백과 가짜 상태(값 · 열린 시트)는 여기 없고 u5-settings.tsx에 있다.
 */

/* ───────────────────────── 가짜 설정 값 · 가짜 계산 ───────────────────────── */

export const KEYS: SettingKey[] = ["walk", "run", "station", "margin"];

/** 네 항목의 값. 속도는 km/h, 시간은 초 */
export type Values = Record<SettingKey, number>;

/** 처음 값 = 「보통」 단계 (결정.md 1절 판정 기본값) */
export const DEFAULTS: Values = { walk: 4.5, run: 9, station: 60, margin: 30 };

/** 세 단계의 값 (결정.md 1절) */
const STEPS: Record<SettingKey, [number, number, number]> = {
    walk: [3.6, 4.5, 5.4],
    run: [7.5, 9, 10.5],
    station: [40, 60, 90],
    margin: [10, 30, 60],
};

/** − + 한 번에 움직이는 양 (결정.md 1절: 걷기 0.1 · 뛰기 0.5km/h, 역 안 이동 · 여유 10초) */
const DELTA: Values = { walk: 0.1, run: 0.5, station: 10, margin: 10 };

/** 가짜 범위 — v32 그림의 예시 값 (걷기 3.0 ~ 6.5 · 뛰기 6 ~ 14km/h · 역 안 이동 10초 ~ 3분 · 여유 10초 ~ 1분 30초) */
const RANGE: Record<SettingKey, [number, number]> = {
    walk: [3, 6.5],
    run: [6, 14],
    station: [10, 180],
    margin: [10, 90],
};

/** 0.1씩 더하다 생기는 끝자리 오차(4.799999…)를 없앤다 — 단계 값(4.8)과 같은지 견줄 수 있게 */
const round1 = (value: number) => Math.round(value * 10) / 10;

/** − (direction −1) · + (direction 1)를 한 번 누른 뒤의 값. 범위를 넘지 않는다 */
export function fakeNudge(key: SettingKey, value: number, direction: -1 | 1): number {
    const [min, max] = RANGE[key];
    return Math.min(max, Math.max(min, round1(value + DELTA[key] * direction)));
}

export const fakeCanDecrease = (key: SettingKey, value: number) => value > RANGE[key][0];
export const fakeCanIncrease = (key: SettingKey, value: number) => value < RANGE[key][1];

/** 지금 값이 세 단계 가운데 어디쯤인지 */
function fakePosition(key: SettingKey, value: number): SettingPosition {
    const [low, mid, high] = STEPS[key];
    if (value === low) return { kind: "step", step: 0 };
    if (value === mid) return { kind: "step", step: 1 };
    if (value === high) return { kind: "step", step: 2 };
    if (value < low) return { kind: "below" };
    if (value > high) return { kind: "above" };
    return { kind: "between", lower: value < mid ? 0 : 1 };
}

/** 값 하나 → 화면에 넘기는 모양 */
export const fakeItem = (key: SettingKey, value: number): SettingItem => ({
    value,
    steps: STEPS[key],
    position: fakePosition(key, value),
});

/** 단계 버튼을 눌렀을 때의 값 */
export const fakeStepValue = (key: SettingKey, step: 0 | 1 | 2) => STEPS[key][step];

/** 바꾼 값이 하나라도 있는지 → 「처음 값으로」가 켜진다 */
export const fakeCanReset = (values: Values) => KEYS.some((key) => values[key] !== DEFAULTS[key]);

/* ───────────────────────── 1. 하단 캡슐 (부품만) ───────────────────────── */

export type NavCase = {
    name: string;
    note: string;
    tone: ScreenTone;  // 캡슐이 놓이는 화면의 바탕
    nav: BottomNavProps;
};

/** 판정 탭이 갈 역이 아직 없을 때 */
const NO_STATION = { ...BOTTOM_NAV, verdictHref: null };

export const NAV_WHITE_CASES: NavCase[] = [
    { name: "역 찾기가 현재 탭", note: "흰 화면 · 현재 탭은 옅은 면 하나", tone: "white", nav: { ...BOTTOM_NAV, active: "search" } },
    { name: "판정이 현재 탭", note: "판정 전 화면(로딩 · 승강장까지 몇 분?)", tone: "white", nav: BOTTOM_NAV },
    { name: "설정이 현재 탭", note: "설정 화면", tone: "white", nav: { ...BOTTOM_NAV, active: "settings" } },
];

export const NAV_OFF_CASES: NavCase[] = [
    {
        name: "꺼진 탭 — 역 찾기에서",
        note: "verdictHref: null → 판정 탭이 더 흐리고 눌리지 않음",
        tone: "white",
        nav: { ...NO_STATION, active: "search" },
    },
    {
        name: "꺼진 탭 — 설정에서",
        note: "아직 본 역이 없을 때의 설정 화면",
        tone: "white",
        nav: { ...NO_STATION, active: "settings" },
    },
    {
        name: "현재 탭인데 주소가 없을 때",
        note: "active: verdict + verdictHref: null → 모습은 현재 탭 그대로, 링크만 아님",
        tone: "white",
        nav: NO_STATION,
    },
    {
        name: "색 화면의 꺼진 탭",
        note: "실제로는 안 나옴 (색 화면이면 판정 탭이 현재 탭) — 값만 확인",
        tone: "run",
        nav: { ...NO_STATION, active: "search" },
    },
];

export const NAV_COLOR_CASES: NavCase[] = [
    { name: "걸어도 돼요 (walk)", note: "검정 20% 바탕 · 현재 탭은 흰색 16% 면", tone: "walk", nav: BOTTOM_NAV },
    { name: "천천히 걸어요 (slow)", note: "", tone: "slow", nav: BOTTOM_NAV },
    { name: "지금 뛰어요! (run)", note: "", tone: "run", nav: BOTTOM_NAV },
    { name: "빨리 뛰어봐요! (tight)", note: "", tone: "tight", nav: BOTTOM_NAV },
    { name: "탈 열차가 아직 안 보여요 (miss)", note: "", tone: "miss", nav: BOTTOM_NAV },
    { name: "막다른 화면 (deadend)", note: "", tone: "deadend", nav: BOTTOM_NAV },
];

/* ───────────────────────── 2. 설정 화면 · 설정 시트 ───────────────────────── */

/** 설정 화면 한 장. 미리보기의 가짜 상태로 값이 바뀌고 시트가 열리고 닫힌다. 여기 값은 처음 상태다 */
export type SettingsCase = {
    id: string;              // 주소에 쓰는 이름 — /preview?screen=이 값
    name: string;            // 보드 제목
    note: string;            // 무엇을 보는 장인지
    small?: boolean;         // true면 375 × 667, 아니면 390 × 844
    values: Values;          // 처음 값
    open: SettingKey | null; // 처음에 열려 있는 시트 (없으면 null)
};

export const SETTINGS_CASES: SettingsCase[] = [
    {
        id: "settings",
        name: "설정 — 눌러 보기",
        note: "전부 「보통」 · 「처음 값으로」 꺼짐. 단계 버튼 · 이름 줄 · 「처음 값으로」를 눌러 봐요",
        values: DEFAULTS,
        open: null,
    },
    {
        id: "settings-custom",
        name: "단계에 없는 값",
        note: "걷기 4.8 · 여유 40초 → 세 버튼이 꺼지고 「직접 · 값」 · 「처음 값으로」 켜짐 (v32 그림)",
        values: { ...DEFAULTS, walk: 4.8, margin: 40 },
        open: null,
    },
    {
        id: "settings-ends",
        name: "양끝 단계",
        note: "전부 단계 값 → 「직접」은 없고 「처음 값으로」만 켜짐",
        values: { walk: 3.6, run: 10.5, station: 90, margin: 10 },
        open: null,
    },
    {
        id: "settings-all-custom",
        name: "네 항목 모두 단계 밖",
        note: "「직접 · 값」이 가장 긴 경우들 (시속 10.0km · 2분 30초 · 1분 20초)",
        values: { walk: 6.5, run: 10, station: 150, margin: 80 },
        open: null,
    },
    {
        id: "settings-small",
        name: "작은 화면 375 × 667",
        note: "카드가 스크롤 없이 들어가고 맨 아래 줄이 캡슐에 안 가리는지",
        small: true,
        values: { ...DEFAULTS, walk: 4.8, margin: 40 },
        open: null,
    },
];

export const SETTING_SHEET_CASES: SettingsCase[] = [
    {
        id: "setting-walk",
        name: "걷기 속도 시트",
        note: "− + 0.1 · 「「보통」이에요」",
        values: DEFAULTS,
        open: "walk",
    },
    {
        id: "setting-run",
        name: "뛰기 속도 시트",
        note: "− + 0.5 · 정수여도 「9.0」",
        values: DEFAULTS,
        open: "run",
    },
    {
        id: "setting-station",
        name: "역 안 이동 시트",
        note: "− + 10초 · 단계 이름이 값 그대로(「1분」)",
        values: DEFAULTS,
        open: "station",
    },
    {
        id: "setting-margin",
        name: "여유 시트",
        note: "설명이 가장 길어 두 줄 — 완료 버튼은 위에 그대로",
        values: DEFAULTS,
        open: "margin",
    },
    {
        id: "setting-between",
        name: "두 단계 사이",
        note: "걷기 4.8 → 「「보통」과 「빠르게」 사이」 (받침 있으면 「과」)",
        values: { ...DEFAULTS, walk: 4.8 },
        open: "walk",
    },
    {
        id: "setting-between-low",
        name: "두 단계 사이 — 아래쪽",
        note: "뛰기 8.0 → 「「가볍게」와 「보통」 사이」 (받침 없으면 「와」)",
        values: { ...DEFAULTS, run: 8 },
        open: "run",
    },
    {
        id: "setting-min",
        name: "가장 작은 값",
        note: "걷기 3.0 → −가 꺼짐 · 「「느긋하게」보다 더 느리게」",
        values: { ...DEFAULTS, walk: 3 },
        open: "walk",
    },
    {
        id: "setting-max",
        name: "가장 큰 값",
        note: "역 안 이동 3분 → +가 꺼짐 · 「「1분 30초」보다 더 길게」",
        values: { ...DEFAULTS, station: 180 },
        open: "station",
    },
    {
        id: "setting-two-parts",
        name: "분과 초가 다 있는 값",
        note: "역 안 이동 1분 10초 → 큰 숫자 두 조각 · 「「1분」과 「1분 30초」 사이」",
        values: { ...DEFAULTS, station: 70 },
        open: "station",
    },
    {
        id: "setting-margin-small",
        name: "여유 시트 — 375 × 667",
        note: "v32 「작은 화면」 묶음의 그림",
        small: true,
        values: DEFAULTS,
        open: "margin",
    },
];

/** 역 찾기 자리 — 화면은 U6에서 만든다. 지금은 흰 화면 틀에 캡슐만 붙은 모습을 본다 */
export const SEARCH_PLACE_ID = "search";

/** 주소(?screen=…)로 한 장만 크게 볼 때 찾는 목록 */
export const U5_CASES: SettingsCase[] = [...SETTINGS_CASES, ...SETTING_SHEET_CASES];

/** 주소의 이름이 U5 화면인지 — page.tsx가 어느 묶음에서 찾을지 정할 때 쓴다 */
export const isU5Screen = (id: string) => id === SEARCH_PLACE_ID || U5_CASES.some((c) => c.id === id);
