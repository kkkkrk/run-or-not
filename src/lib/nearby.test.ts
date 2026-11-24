// src/lib/nearby.test.ts
// 가까운 역 찾기와, 위치 상태 → 「가까운 역」 묶음 변환을 고정한다 (plan v3 L6 · 7절: 3개 · 2km 이하 · 직선거리)
// 기대값은 stations.json의 실제 좌표로 잰 값이다
import { describe, expect, it } from "vitest";
import { getLineColor } from "@/lib/line-color";
import { toNearby } from "@/lib/nearby";
import { allStations, findNearbyStation, NEARBY_RADIUS_M } from "@/lib/stations";

function coordOf(name: string, lineName: string) {
    const station = allStations.find((s) => s.name === name && s.lineName === lineName);
    if (!station) throw new Error(`역이 없음: ${lineName} ${name}`);
    return { lat: station.lat, lng: station.lng };
}

/** 그 위도에서 남쪽으로 d m 내려간 위도 */
const south = (lat: number, d: number) => lat - (d / 6371000) * (180 / Math.PI);

const GONGNEUNG = coordOf("공릉", "7호선");
const GWANAKSAN = { lat: 37.4449, lng: 126.964 }; // 관악산 정상 — 가장 가까운 낙성대가 3.5km

describe("findNearbyStation — 가까운 순서로 3개, 2km 안", () => {
    it("공릉역 좌표 → 공릉(7) 0m · 태릉입구(7) 857m · 태릉입구(6) 948m 순서", () => {
        const found = findNearbyStation(GONGNEUNG.lat, GONGNEUNG.lng);
        expect(found.map((f) => f.station.id)).toEqual(["2718-1007", "2719-1007", "2646-1006"]);
        expect(found.map((f) => Math.round(f.distanceM))).toEqual([0, 857, 948]);
    });
    it("환승역은 호선마다 한 줄 — 건대입구 7호선 · 2호선이 따로 나온다", () => {
        const konkuk = coordOf("건대입구", "7호선");
        const found = findNearbyStation(konkuk.lat, konkuk.lng);
        expect(found.map((f) => `${f.station.name} ${f.station.lineName}`)).toEqual([
            "건대입구 7호선",
            "건대입구 2호선",
            "어린이대공원 7호선",
        ]);
    });
    it("2km 안에 역이 많아도 3개까지만 (동대문 근처는 28개)", () => {
        const dongdaemun = coordOf("동대문", "4호선");
        expect(findNearbyStation(dongdaemun.lat, dongdaemun.lng)).toHaveLength(3);
    });
    it("2km 안에 역이 없으면 빈 배열 (관악산 정상)", () => {
        expect(findNearbyStation(GWANAKSAN.lat, GWANAKSAN.lng)).toEqual([]);
    });
    it("거리가 같으면 stations.json 순서 그대로 — 까치산은 2호선이 먼저", () => {
        const kkachisan = coordOf("까치산", "2호선"); // 2호선 · 5호선 좌표가 같다
        const found = findNearbyStation(kkachisan.lat, kkachisan.lng);
        expect(found.slice(0, 2).map((f) => f.station.lineName)).toEqual(["2호선", "5호선"]);
    });
    it("경계: 온수역에서 1999m 떨어지면 온수가 들어 있고, 2001m면 빠진다", () => {
        const onsu = coordOf("온수", "7호선");
        const names = (d: number) => findNearbyStation(south(onsu.lat, d), onsu.lng).map((f) => f.station.name);
        expect(names(1999)).toContain("온수");
        expect(names(2001)).not.toContain("온수");
    });
});

describe("toNearby — 위치 상태 → 「가까운 역」 묶음", () => {
    it("권한 답을 기다리는 중(unknown)에도 「내 위치로 찾기」 줄을 둔다", () => {
        expect(toNearby({ status: "unknown" })).toEqual({ status: "idle" });
    });
    it("idle → idle, locating → locating", () => {
        expect(toNearby({ status: "idle" })).toEqual({ status: "idle" });
        expect(toNearby({ status: "locating" })).toEqual({ status: "locating" });
    });
    it("ok + 가까운 역 있음 → 목록 (줄마다 id · 이름 · 호선 · 색 · 거리)", () => {
        const nearby = toNearby({ status: "ok", ...GONGNEUNG, accuracy: 10, anchor: GONGNEUNG });
        if (nearby.status !== "list") throw new Error(`list가 아님: ${nearby.status}`);
        expect(nearby.rows).toHaveLength(3);
        expect(nearby.rows[0]).toEqual({
            stationId: "2718-1007",
            stationName: "공릉",
            lineName: "7호선",
            lineColor: getLineColor("7호선"),
            distanceM: 0,
        });
        expect(nearby.rows[2].lineColor).toBe(getLineColor("6호선"));
    });
    it("ok + 2km 안에 없음 → none + 기준 거리", () => {
        expect(toNearby({ status: "ok", ...GWANAKSAN, accuracy: 10, anchor: GWANAKSAN })).toEqual({ status: "none", radiusM: NEARBY_RADIUS_M });
    });
    it("거부 → denied, 미지원 → unsupported", () => {
        expect(toNearby({ status: "denied" })).toEqual({ status: "denied" });
        expect(toNearby({ status: "unsupported" })).toEqual({ status: "unsupported" });
    });
    it("시간 초과 · 사용 불가는 둘 다 failed (화면은 한 가지 안내만 쓴다)", () => {
        expect(toNearby({ status: "timeout" })).toEqual({ status: "failed" });
        expect(toNearby({ status: "unavailable" })).toEqual({ status: "failed" });
    });
});
