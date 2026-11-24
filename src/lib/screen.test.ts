// src/lib/screen.test.ts
import { describe, it, expect } from "vitest";
import { pickScreen, type ScreenInput } from "./screen";

const base: ScreenInput = {
    ready: true, hasData: true, isOffline: false, isError: false,
    hasWalkTime: true, locationStep: null, elapsedSec: 10, noTrains: false,
};

describe("pickScreen", () => {
    it("1. 준비 전이면 loading", () => {
        expect(pickScreen({ ...base, ready: false })).toBe("loading");
    });
    it("몇분 걸리는지 모를 때", () => {
        expect(pickScreen({ ...base, hasWalkTime: false })).toBe("ask");
    })
    it("오프라인일 때", () => {
        expect(pickScreen({ ...base, isOffline:true, hasData: false })).toBe("offline");
    })
    it("120초일 때", () => {
        expect(pickScreen({ ...base, elapsedSec: 119 })).toBe("verdict");
    })
    it("121초일 때", () => {
        expect(pickScreen({ ...base, elapsedSec: 120 })).toBe("stalled");
    })
    it("열차가 없을 때", () => {
        expect(pickScreen({ ...base, noTrains: true})).toBe("empty");
    })
});

describe("pickScreen — 내 위치로 계산하는 중 (L6)", () => {
    it("도보 시간이 없고 위치 확인 중이면 locating, 걷는 길 계산 중이면 routing", () => {
        expect(pickScreen({ ...base, hasWalkTime: false, locationStep: "locating" })).toBe("locating");
        expect(pickScreen({ ...base, hasWalkTime: false, locationStep: "routing" })).toBe("routing");
    });
    it("도보 시간이 이미 있으면 다시 계산하는 중이어도 판정 화면 그대로", () => {
        expect(pickScreen({ ...base, locationStep: "locating" })).toBe("verdict");
        expect(pickScreen({ ...base, locationStep: "routing" })).toBe("verdict");
    });
    it("준비 전이면 계산 중이어도 그냥 loading", () => {
        expect(pickScreen({ ...base, ready: false, hasWalkTime: false, locationStep: "locating" })).toBe("loading");
    });
    it("도보 시간이 없으면 도착 정보를 못 받았어도 계산 중 화면이 먼저", () => {
        expect(pickScreen({ ...base, hasWalkTime: false, hasData: false, isError: true, locationStep: "routing" })).toBe("routing");
    });
});