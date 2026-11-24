// src/lib/geo-state.test.ts
// 위치 상태가 사건마다 어떻게 바뀌는지 고정한다 (plan v3 L6 · 7절 「L6 전」 결정)
import { describe, expect, it } from "vitest";
import { nextGeo, type GeoState } from "./geo-state";

const HERE = { lat: 37.6, lng: 127.0 };

const UNKNOWN: GeoState = { status: "unknown" };
const IDLE: GeoState = { status: "idle" };
const LOCATING: GeoState = { status: "locating" };
const OK: GeoState = { status: "ok", ...HERE, accuracy: 20, anchor: HERE }; // 지금 자리 = 기준점
const DENIED: GeoState = { status: "denied" };
const TIMEOUT: GeoState = { status: "timeout" };
const UNAVAILABLE: GeoState = { status: "unavailable" };
const UNSUPPORTED: GeoState = { status: "unsupported" };

/** 위도 37.6°에서 북쪽으로 d m 떨어진 위도 */
const north = (d: number) => 37.6 + (d / 6371000) * (180 / Math.PI);

describe("1. 열 때 물어본 권한 (permission)", () => {
    it("아직 모름 → 안 물어봄(prompt)이면 idle", () => {
        expect(nextGeo(UNKNOWN, { type: "permission", state: "prompt" })).toEqual(IDLE);
    });
    it("아직 모름 → 이미 거부했으면 처음부터 denied (plan.md 7절)", () => {
        expect(nextGeo(UNKNOWN, { type: "permission", state: "denied" })).toEqual(DENIED);
    });
    it("이미 눌러서 확인 중이면 늦게 온 권한 답은 버린다", () => {
        expect(nextGeo(LOCATING, { type: "permission", state: "prompt" })).toBe(LOCATING);
        expect(nextGeo(LOCATING, { type: "permission", state: "denied" })).toBe(LOCATING);
        expect(nextGeo(OK, { type: "permission", state: "prompt" })).toBe(OK);
    });
});

describe("2. 요청 (request)", () => {
    it.each([UNKNOWN, IDLE, OK, TIMEOUT, UNAVAILABLE])("%o → locating", (prev) => {
        expect(nextGeo(prev, { type: "request" })).toEqual(LOCATING);
    });
});

describe("3. 위치가 옴 (position)", () => {
    const position = { type: "position", lat: 37.61, lng: 127.01, accuracy: 30 } as const;
    const there = { lat: 37.61, lng: 127.01 };

    it("확인 중이면 ok + 좌표 · 정확도. 첫 위치가 기준점이 된다", () => {
        expect(nextGeo(LOCATING, position)).toEqual({ status: "ok", ...there, accuracy: 30, anchor: there });
    });
    it("시간 제한 뒤 늦게 온 위치는 버린다 (plan.md 7절)", () => {
        expect(nextGeo(TIMEOUT, position)).toBe(TIMEOUT);
    });
    it("그만둔 뒤(idle) · 거부 뒤에 온 위치도 버린다", () => {
        expect(nextGeo(IDLE, position)).toBe(IDLE);
        expect(nextGeo(DENIED, position)).toBe(DENIED);
    });
    it("minMoveM · anchorMoveM이 없으면 온 위치를 그대로 쓰고 기준점도 따라온다 (역 찾기처럼 한 번만 받을 때)", () => {
        expect(nextGeo(OK, position)).toEqual({ status: "ok", ...there, accuracy: 30, anchor: there });
    });
});

describe("4. 따라갈 때 — 작은 움직임은 무시한다 (minMoveM)", () => {
    // 역 화면이 넣는 값: 10m 넘게 움직여야 새 위치, 기준점에서 50m 넘으면 기준점을 옮김
    const moved = (d: number, accuracy = 5) =>
        ({ type: "position", lat: north(d), lng: 127.0, accuracy, minMoveM: 10, anchorMoveM: 50 }) as const;

    it("9m 움직임 → 그대로 (같은 객체라 화면을 다시 그리지 않는다)", () => {
        expect(nextGeo(OK, moved(9))).toBe(OK);
    });
    it("11m 움직임 → 지금 자리가 바뀐다. 기준점은 그대로", () => {
        expect(nextGeo(OK, moved(11))).toEqual({ status: "ok", lat: north(11), lng: 127.0, accuracy: 5, anchor: HERE });
    });
    it("제자리에서 정확도만 좋아진 위치는 쓰지 않는다", () => {
        expect(nextGeo(OK, moved(0))).toBe(OK);
    });
    it("위치가 부정확하면 그 오차만큼은 움직임으로 보지 않는다 — 정확도 30m: 29m는 무시, 31m는 받음", () => {
        expect(nextGeo(OK, moved(29, 30))).toBe(OK);
        expect(nextGeo(OK, moved(31, 30))).toMatchObject({ lat: north(31), accuracy: 30 });
    });
    it("아무리 부정확해도 50m(anchorMoveM)를 넘게 움직였으면 받는다 — 정확도 200m: 49m는 무시, 51m는 받음", () => {
        expect(nextGeo(OK, moved(49, 200))).toBe(OK);
        expect(nextGeo(OK, moved(51, 200))).toMatchObject({ lat: north(51), accuracy: 200 });
    });
    it("anchorMoveM 없이 minMoveM만 넣으면 정확도와 상관없이 그 값만 본다", () => {
        const only = (d: number) => ({ type: "position", lat: north(d), lng: 127.0, accuracy: 200, minMoveM: 10 }) as const;
        expect(nextGeo(OK, only(9))).toBe(OK);
        expect(nextGeo(OK, only(11))).toMatchObject({ lat: north(11) });
    });
    it("새 시도의 첫 위치는 얼마나 움직였든 받는다 (직전이 locating)", () => {
        expect(nextGeo(LOCATING, moved(0))).toEqual({ status: "ok", ...HERE, accuracy: 5, anchor: HERE });
    });
});

describe("5. 따라갈 때 — 기준점은 멀리 갔을 때만 옮긴다 (anchorMoveM)", () => {
    const moved = (d: number) =>
        ({ type: "position", lat: north(d), lng: 127.0, accuracy: 5, minMoveM: 10, anchorMoveM: 50 }) as const;

    it("기준점에서 49m → 기준점은 같은 객체 그대로 (걷는 길을 다시 묻지 않는다)", () => {
        const next = nextGeo(OK, moved(49));
        expect(next).toMatchObject({ status: "ok", lat: north(49) });
        expect(next.status === "ok" && next.anchor).toBe(HERE);
    });
    it("기준점에서 51m → 지금 자리가 새 기준점", () => {
        expect(nextGeo(OK, moved(51))).toEqual({
            status: "ok", lat: north(51), lng: 127.0, accuracy: 5, anchor: { lat: north(51), lng: 127.0 },
        });
    });
    it("거리는 「바로 앞 자리」가 아니라 「기준점」에서 잰다 — 20m씩 세 번 가면 세 번째(60m)에 옮긴다", () => {
        const a = nextGeo(OK, moved(20));
        const b = nextGeo(a, moved(40));
        const c = nextGeo(b, moved(60));
        expect(a).toMatchObject({ lat: north(20), anchor: HERE });
        expect(b).toMatchObject({ lat: north(40), anchor: HERE });
        expect(c).toMatchObject({ lat: north(60), anchor: { lat: north(60), lng: 127.0 } });
    });
    it("기준점을 옮긴 뒤에는 새 기준점에서 다시 잰다 — 60m에서 옮기고 100m(40m 더)에서는 그대로", () => {
        const c = nextGeo(OK, moved(60));
        expect(nextGeo(c, moved(100))).toMatchObject({ lat: north(100), anchor: { lat: north(60), lng: 127.0 } });
    });
});

describe("6. 에러 (error) — 1 거부 · 2 사용 불가 · 3 시간 초과", () => {
    it("거부는 언제 와도 denied (따라가던 중에 권한을 끈 경우 포함)", () => {
        expect(nextGeo(LOCATING, { type: "error", code: 1 })).toEqual(DENIED);
        expect(nextGeo(OK, { type: "error", code: 1 })).toEqual(DENIED);
    });
    it("확인 중에 시간 초과 → timeout, 사용 불가 → unavailable", () => {
        expect(nextGeo(LOCATING, { type: "error", code: 3 })).toEqual(TIMEOUT);
        expect(nextGeo(LOCATING, { type: "error", code: 2 })).toEqual(UNAVAILABLE);
    });
    it("이미 위치를 받은 뒤의 시간 초과 · 사용 불가는 무시한다 (받아 둔 위치를 지우지 않는다)", () => {
        expect(nextGeo(OK, { type: "error", code: 3 })).toBe(OK);
        expect(nextGeo(OK, { type: "error", code: 2 })).toBe(OK);
    });
});

describe("7. 60초 안전장치 (limit)", () => {
    it("확인 중이면 timeout", () => {
        expect(nextGeo(LOCATING, { type: "limit" })).toEqual(TIMEOUT);
    });
    it("이미 끝난 뒤면 그대로", () => {
        expect(nextGeo(OK, { type: "limit" })).toBe(OK);
        expect(nextGeo(DENIED, { type: "limit" })).toBe(DENIED);
    });
});

describe("8. 그만 (stop)", () => {
    it.each([LOCATING, OK, TIMEOUT, UNAVAILABLE])("%o → idle (하던 일 · 실패 안내를 치운다)", (prev) => {
        expect(nextGeo(prev, { type: "stop" })).toEqual(IDLE);
    });
    it.each([UNKNOWN, IDLE, DENIED, UNSUPPORTED])("%o → 그대로", (prev) => {
        expect(nextGeo(prev, { type: "stop" })).toBe(prev);
    });
});
