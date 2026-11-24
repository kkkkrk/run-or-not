// src/lib/walk-state.test.ts
// 「승강장까지」 값이 직접 입력 ↔ 내 위치 사이에서 어떻게 바뀌는지, 그 상태가 화면 props로 어떻게 나가는지 고정한다
// (plan v3 L6, 결정.md 1절 「위치를 허용했을 때」 · 「위치를 못 얻었을 때」, ui.ts 6 · 7절)
import { describe, expect, it } from "vitest";
import type { GeoState } from "./geo-state";
import {
    INITIAL_WALK,
    needsSync,
    nextWalk,
    stepWalkSec,
    toAskLocation,
    toLocationStep,
    toRowSource,
    toSheetLocation,
    toWalkInput,
    type WalkState,
} from "./walk-state";

const A420 = { meters: 420, approximate: false, crosswalks: 0 };  // 내 위치로 계산한 420m (앞에 횡단보도 없음)
const A260 = { meters: 260, approximate: true, crosswalks: 0 };   // T맵 실패 → 어림 260m

const MANUAL: WalkState = { manualSec: 300, auto: null, waiting: false, open: false };  // 칩 5분
const AUTO: WalkState = { manualSec: null, auto: A420, waiting: false, open: false };   // 내 위치 420m

const IDLE: GeoState = { status: "idle" };
const LOCATING: GeoState = { status: "locating" };
const OK: GeoState = { status: "ok", lat: 37.6, lng: 127.0, accuracy: 20, anchor: { lat: 37.6, lng: 127.0 } };
const TIMEOUT: GeoState = { status: "timeout" };

describe("nextWalk — 사건 하나", () => {
    it("직접 고름: 그 값을 쓰고, 기다리던 계산은 없던 일로", () => {
        const waiting: WalkState = { ...AUTO, waiting: true, open: true };
        expect(nextWalk(waiting, { type: "manual", sec: 420 })).toEqual({ manualSec: 420, auto: A420, waiting: false, open: true });
    });
    it("「내 위치로」 버튼: 기다림만 켠다 — 값은 누르기 전 그대로", () => {
        expect(nextWalk(MANUAL, { type: "locate" })).toEqual({ ...MANUAL, waiting: true });
    });
    it("기다리던 계산이 끝남: 내 위치 값으로 바꾸고 시트를 닫는다", () => {
        const waiting: WalkState = { ...MANUAL, waiting: true, open: true };
        expect(nextWalk(waiting, { type: "routed", auto: A420 })).toEqual({ manualSec: null, auto: A420, waiting: false, open: false });
    });
    it("누르지 않았는데 끝난 계산(걸어서 자리가 바뀜): 값만 바꾸고 열린 시트는 그대로", () => {
        const open: WalkState = { ...AUTO, open: true };
        expect(nextWalk(open, { type: "routed", auto: A260 })).toEqual({ ...open, auto: A260 });
    });
    it("시트 열기 · 닫기는 값을 건드리지 않는다", () => {
        expect(nextWalk(AUTO, { type: "sheet", open: true })).toEqual({ ...AUTO, open: true });
        expect(nextWalk({ ...MANUAL, open: true }, { type: "sheet", open: false })).toEqual(MANUAL);
    });
});

describe("nextWalk — 이어지는 흐름", () => {
    it("이미 허용한 사람: 들어오자마자 계산이 끝나면 바로 내 위치 값", () => {
        const walk = nextWalk(INITIAL_WALK, { type: "routed", auto: A420 });
        expect(toWalkInput(walk)).toEqual({ meters: 420, waitSec: 0 });
        expect(toRowSource(walk)).toEqual({ source: "location", approximate: false });
    });
    it("내 위치 → 칩(직접) → 다시 「내 위치로」: 확인하는 동안에는 직접 고른 값이 남고, 끝나면 내 위치 값", () => {
        let walk = nextWalk({ ...AUTO, open: true }, { type: "manual", sec: 300 });
        expect(toWalkInput(walk)).toEqual({ walkSec: 300 });

        walk = nextWalk(walk, { type: "locate" });
        expect(toWalkInput(walk)).toEqual({ walkSec: 300 }); // 아직 누르기 전 값

        walk = nextWalk(walk, { type: "routed", auto: A260 });
        expect(toWalkInput(walk)).toEqual({ meters: 260, waitSec: 0 });
        expect(walk.open).toBe(false);
    });
    it("확인하는 중에 칩을 누르면: 뒤늦게 끝난 계산이 직접 고른 값을 덮지 않는다", () => {
        let walk = nextWalk({ ...MANUAL, open: true }, { type: "locate" });
        walk = nextWalk(walk, { type: "manual", sec: 420 });
        walk = nextWalk(walk, { type: "routed", auto: A420 });
        expect(toWalkInput(walk)).toEqual({ walkSec: 420 });
        expect(walk.open).toBe(true);
    });
});

describe("stepWalkSec — − + 한 번 (30초 눈금)", () => {
    it("눈금 위의 값: 300 → + 330 · − 270", () => {
        expect(stepWalkSec(300, 1)).toBe(330);
        expect(stepWalkSec(300, -1)).toBe(270);
    });
    it("눈금 사이의 값(내 위치로 계산한 396초): + 420 · − 390", () => {
        expect(stepWalkSec(396, 1)).toBe(420);
        expect(stepWalkSec(396, -1)).toBe(390);
    });
    it("60 → − 30 (가장 작은 값)", () => {
        expect(stepWalkSec(60, -1)).toBe(30);
    });
});

describe("toWalkInput · toRowSource — 판정과 「승강장까지」 줄에 넘길 값", () => {
    it("아무 값도 없으면 null (→ 「승강장까지 몇 분?」)", () => {
        expect(toWalkInput(INITIAL_WALK)).toBeNull();
    });
    it("직접 고른 값이 있으면 내 위치 값보다 먼저다", () => {
        const both: WalkState = { ...AUTO, manualSec: 180 };
        expect(toWalkInput(both)).toEqual({ walkSec: 180 });
        expect(toRowSource(both)).toEqual({ source: "manual" });
    });
    it("내 위치 값: 거리(m)로 넘기고, 어림값이면 approximate", () => {
        expect(toWalkInput(AUTO)).toEqual({ meters: 420, waitSec: 0 });
        expect(toRowSource({ ...AUTO, auto: A260 })).toEqual({ source: "location", approximate: true });
    });
    it("앞에 횡단보도가 있으면 하나에 30초씩 대기 시간으로 넘긴다", () => {
        expect(toWalkInput({ ...AUTO, auto: { ...A420, crosswalks: 1 } })).toEqual({ meters: 420, waitSec: 30 });
        expect(toWalkInput({ ...AUTO, auto: { ...A420, crosswalks: 3 } })).toEqual({ meters: 420, waitSec: 90 });
    });
    it("직접 고른 값에는 횡단보도 대기를 더하지 않는다 (고른 값이 승강장까지 총 시간이다)", () => {
        const both: WalkState = { ...AUTO, auto: { ...A420, crosswalks: 2 }, manualSec: 300 };
        expect(toWalkInput(both)).toEqual({ walkSec: 300 });
    });
});

describe("needsSync — 끝난 계산을 상태에 옮겨 적어야 하나", () => {
    it("아직 내 위치 값이 없으면 옮긴다", () => {
        expect(needsSync(INITIAL_WALK, A420)).toBe(true);
    });
    it("값이 같으면 옮기지 않는다 (끝없이 다시 그리지 않게)", () => {
        expect(needsSync(AUTO, { meters: 420, approximate: false, crosswalks: 0 })).toBe(false);
    });
    it("거리 · 「약」 · 횡단보도 수 가운데 하나라도 달라지면 옮긴다", () => {
        expect(needsSync(AUTO, { meters: 421, approximate: false, crosswalks: 0 })).toBe(true);
        expect(needsSync(AUTO, { meters: 420, approximate: true, crosswalks: 0 })).toBe(true);
        expect(needsSync(AUTO, { meters: 420, approximate: false, crosswalks: 1 })).toBe(true);
    });
    it("버튼을 눌러 기다리던 중이면 값이 같아도 옮긴다 (그래야 시트가 닫힌다)", () => {
        expect(needsSync({ ...AUTO, waiting: true }, { meters: 420, approximate: false, crosswalks: 0 })).toBe(true);
    });
});

describe("toLocationStep — 내 위치로 계산하는 중이면 어느 단계인가", () => {
    it("위치 확인 중 → locating", () => {
        expect(toLocationStep(LOCATING, null)).toBe("locating");
    });
    it("위치는 받았고 걷는 길 답이 아직 → routing", () => {
        expect(toLocationStep(OK, null)).toBe("routing");
    });
    it("계산이 끝났으면 null", () => {
        expect(toLocationStep(OK, A420)).toBeNull();
    });
    it("위치를 안 쓰는 중이면 null", () => {
        expect(toLocationStep(IDLE, null)).toBeNull();
        expect(toLocationStep(TIMEOUT, null)).toBeNull();
    });
});

describe("toAskLocation — 「승강장까지 몇 분?」 화면의 위치 버튼", () => {
    it.each([
        ["idle", "idle"],
        ["unknown", "idle"],
        ["timeout", "failed"],
        ["unavailable", "failed"],
        ["denied", "denied"],
        ["unsupported", "unsupported"],
    ] as const)("%s → %s", (status, expected) => {
        expect(toAskLocation({ status })).toBe(expected);
    });
});

describe("toSheetLocation — 시트 맨 아래 위치 줄", () => {
    it("직접 고른 값 → 「내 위치로 계산하기」(idle)", () => {
        expect(toSheetLocation(IDLE, MANUAL, null)).toEqual({ status: "idle", failed: false });
    });
    it("내 위치 값 → 검정 면 + 계산에 쓴 거리(active)", () => {
        expect(toSheetLocation(OK, AUTO, null)).toEqual({ status: "active", distanceM: 420, failed: false });
    });
    it("직접 고른 값에서 버튼을 누름 → 확인 중, source는 manual (고른 칩이 칠해진 채)", () => {
        const waiting: WalkState = { ...MANUAL, waiting: true, open: true };
        expect(toSheetLocation(LOCATING, waiting, "locating")).toEqual({ status: "locating", source: "manual" });
    });
    it("내 위치 값에서 다시 누름 → 확인 중, source는 location. 걷는 길 계산 중에도 같다", () => {
        const waiting: WalkState = { ...AUTO, waiting: true, open: true };
        expect(toSheetLocation(LOCATING, waiting, "locating")).toEqual({ status: "locating", source: "location" });
        expect(toSheetLocation(OK, waiting, "routing")).toEqual({ status: "locating", source: "location" });
    });
    it("누르지 않았는데 다시 계산 중(기준점이 옮겨져 T맵을 다시 묻는 중)이면 확인 중으로 바꾸지 않는다", () => {
        expect(toSheetLocation(OK, { ...AUTO, open: true }, "routing")).toEqual({ status: "active", distanceM: 420, failed: false });
    });
    it("위치를 못 찾음: 버튼은 실패 전 모양 그대로 + failed", () => {
        expect(toSheetLocation(TIMEOUT, { ...MANUAL, waiting: true }, null)).toEqual({ status: "idle", failed: true });
        expect(toSheetLocation(TIMEOUT, { ...AUTO, waiting: true }, null)).toEqual({ status: "active", distanceM: 420, failed: true });
        expect(toSheetLocation({ status: "unavailable" }, MANUAL, null)).toEqual({ status: "idle", failed: true });
    });
    it("거부 · 미지원은 값이 무엇이든 안내 한 줄", () => {
        expect(toSheetLocation({ status: "denied" }, AUTO, null)).toEqual({ status: "denied" });
        expect(toSheetLocation({ status: "unsupported" }, MANUAL, null)).toEqual({ status: "unsupported" });
    });
});
