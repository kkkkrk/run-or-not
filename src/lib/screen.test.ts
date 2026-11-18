// src/lib/screen.test.ts
import { describe, it, expect } from "vitest";
import { pickScreen, type ScreenInput } from "./screen";

const base: ScreenInput = {
    ready: true, hasData: true, isOffline: false, isError: false,
    hasWalkTime: true, elapsedSec: 10, noTrains: false,
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