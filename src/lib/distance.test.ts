// src/lib/distance.test.ts
// 직선거리 계산을 고정한다 (plan v3 L6). 기대값은 stations.json의 실제 좌표로 잰 값이다
import { describe, expect, it } from "vitest";
import { getDistance } from "./distance";

// 공릉(7호선) · 태릉입구(7호선) 좌표 — stations.json
const GONGNEUNG = { lat: 37.625742, lng: 127.072896 };
const TAEREUNG_7 = { lat: 37.618294, lng: 127.075397 };

describe("getDistance — 두 좌표 사이 직선거리(m)", () => {
    it("같은 점이면 0", () => {
        expect(getDistance(37.6, 127.0, 37.6, 127.0)).toBe(0);
    });
    it("공릉 → 태릉입구(7호선)는 약 857m", () => {
        expect(getDistance(GONGNEUNG.lat, GONGNEUNG.lng, TAEREUNG_7.lat, TAEREUNG_7.lng)).toBeCloseTo(857, 0);
    });
    it("출발 · 도착을 바꿔도 같은 값", () => {
        expect(getDistance(TAEREUNG_7.lat, TAEREUNG_7.lng, GONGNEUNG.lat, GONGNEUNG.lng)).toBe(
            getDistance(GONGNEUNG.lat, GONGNEUNG.lng, TAEREUNG_7.lat, TAEREUNG_7.lng),
        );
    });
    it("위도 0.001°는 약 111m, 경도 0.001°는 서울에서 약 88m — 위도 · 경도 자리를 바꿔 넣으면 여기서 걸린다", () => {
        expect(getDistance(37.6, 127.0, 37.601, 127.0)).toBeCloseTo(111.2, 1);
        expect(getDistance(37.6, 127.0, 37.6, 127.001)).toBeCloseTo(88.1, 1);
    });
});
