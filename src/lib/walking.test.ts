// src/lib/walking.test.ts
// 걷는 거리 route가 쓰는 함수(본문 읽기 · T맵 총거리와 횡단보도 꺼내기)와, T맵 결과 → 화면에 쓸 거리 변환을 고정한다 (plan v3 L6)
// 픽스처는 실제 T맵 응답이다 (2026-11-23, 공릉역 북동쪽 약 450m 지점 → 공릉역. 요청 본문은 파일 안 request)
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/tmap-pedestrian-gongneung.json";
import {
    countCrosswalksAhead,
    estimateWalkingM,
    liveWalkingM,
    readCrosswalkLeftM,
    readTotalDistance,
    readWalkingRequest,
    toAutoWalk,
    type RouteResult,
} from "./walking";

const GONGNEUNG = { lat: 37.625742, lng: 127.072896 };  // 공릉(7호선) — stations.json
const FROM = { lat: 37.629, lng: 127.076 };             // 픽스처를 받을 때 보낸 출발점. 공릉역까지 직선 약 454m

// 계산하기 쉬운 가짜 자리: 기준점 A, 역은 A에서 정북으로 500m
const A = { lat: 37.6, lng: 127.0 };
const north = (d: number) => ({ lat: 37.6 + (d / 6371000) * (180 / Math.PI), lng: 127.0 });               // A에서 북쪽으로 d m (음수면 남쪽)
const east = (d: number) => ({ lat: 37.6, lng: 127.0 + (d / (6371000 * Math.cos((37.6 * Math.PI) / 180))) * (180 / Math.PI) }); // A에서 동쪽으로 d m
const STATION = north(500);

describe("readWalkingRequest — 브라우저가 보낸 본문 읽기", () => {
    const valid = { stationId: "2718-1007", from: { lat: 37.629, lng: 127.076 } };

    it("맞는 모양이면 그 값을 돌려준다", () => {
        expect(readWalkingRequest(valid)).toEqual(valid);
    });
    it("딸려 온 다른 값은 버린다", () => {
        const body = { ...valid, extra: 1, from: { ...valid.from, accuracy: 20 } };
        expect(readWalkingRequest(body)).toEqual(valid);
    });
    it("객체가 아니면 null (null · 문자열 · 배열)", () => {
        expect(readWalkingRequest(null)).toBeNull();
        expect(readWalkingRequest("2718-1007")).toBeNull();
        expect(readWalkingRequest([])).toBeNull();
    });
    it("stationId가 없거나 · 문자열이 아니거나 · 빈 문자열이면 null", () => {
        expect(readWalkingRequest({ from: valid.from })).toBeNull();
        expect(readWalkingRequest({ ...valid, stationId: 2718 })).toBeNull();
        expect(readWalkingRequest({ ...valid, stationId: "" })).toBeNull();
    });
    it("from이 없거나 lat · lng가 숫자가 아니면 null (문자열 \"37.629\"도 안 된다)", () => {
        expect(readWalkingRequest({ stationId: "2718-1007" })).toBeNull();
        expect(readWalkingRequest({ ...valid, from: { lat: "37.629", lng: 127.076 } })).toBeNull();
        expect(readWalkingRequest({ ...valid, from: { lat: 37.629, lng: "127.076" } })).toBeNull();
        expect(readWalkingRequest({ ...valid, from: { lat: 37.629 } })).toBeNull();
    });
    it("범위 밖 좌표는 null — 위도는 ±90, 경도는 ±180까지", () => {
        expect(readWalkingRequest({ ...valid, from: { lat: 90, lng: 180 } })).not.toBeNull();
        expect(readWalkingRequest({ ...valid, from: { lat: 90.1, lng: 127 } })).toBeNull();
        expect(readWalkingRequest({ ...valid, from: { lat: 37, lng: -180.1 } })).toBeNull();
    });
    it("JSON으로 들어올 수 있는 Infinity(1e999)도 null", () => {
        const body: unknown = JSON.parse('{"stationId":"2718-1007","from":{"lat":1e999,"lng":127}}');
        expect(readWalkingRequest(body)).toBeNull();
    });
});

describe("readTotalDistance — T맵 응답에서 총거리 꺼내기", () => {
    it("실제 응답: 출발점 feature의 totalDistance 647m", () => {
        expect(readTotalDistance(fixture.response)).toBe(647);
    });
    it("실제 응답: 구간 거리(선)를 다 더하면 총거리와 같다", () => {
        const sum = fixture.response.features.reduce((acc, f) => acc + (f.properties.distance ?? 0), 0);
        expect(sum).toBe(647);
    });
    it("총거리가 첫 feature가 아니어도 찾는다", () => {
        const raw = { features: [{ properties: { distance: 31 } }, { properties: { totalDistance: 500 } }] };
        expect(readTotalDistance(raw)).toBe(500);
    });
    it("0m도 거리다", () => {
        expect(readTotalDistance({ features: [{ properties: { totalDistance: 0 } }] })).toBe(0);
    });
    it("총거리가 없거나 숫자가 아니면 null", () => {
        expect(readTotalDistance({ features: [] })).toBeNull();
        expect(readTotalDistance({ features: [{ properties: { distance: 31 } }] })).toBeNull();
        expect(readTotalDistance({ features: [{ properties: { totalDistance: "647" } }] })).toBeNull();
        expect(readTotalDistance({ features: [{ properties: { totalDistance: -1 } }] })).toBeNull();
    });
    it("모양이 다르면 null (T맵 에러 본문 · null · features가 배열이 아님)", () => {
        expect(readTotalDistance({ error: { id: "400", code: "1007" } })).toBeNull();
        expect(readTotalDistance(null)).toBeNull();
        expect(readTotalDistance({ features: "없음" })).toBeNull();
        expect(readTotalDistance({ features: [null, 3, { properties: null }] })).toBeNull();
    });
});

describe("readCrosswalkLeftM — T맵 응답에서 횡단보도 꺼내기", () => {
    /** 선 구간 하나. facilityType "15"가 횡단보도, "11"은 보통 길 */
    const line = (distance: number, facilityType: unknown = "11") => ({ geometry: { type: "LineString" }, properties: { distance, facilityType } });
    const point = (turnType: number) => ({ geometry: { type: "Point" }, properties: { turnType, facilityType: "15" } });

    it("실제 응답: 횡단보도 2개 가운데 역 앞 것(「공릉역 1번출구에서 횡단보도」, 남은 길 52m에서 시작)은 빼고 하나 — 건넌 뒤 419m", () => {
        expect(readCrosswalkLeftM(fixture.response)).toEqual([419]);
    });
    it("길 순서대로, 횡단보도마다 「다 건넌 뒤 남는 거리」", () => {
        // 100 + [20] + 300 + [30] + 200 = 650m → 첫 횡단보도 뒤 530m, 둘째 횡단보도 뒤 200m
        const raw = { features: [line(100), line(20, "15"), line(300), line(30, "15"), line(200)] };
        expect(readCrosswalkLeftM(raw)).toEqual([530, 200]);
    });
    it("역 앞 150m 안에서 시작하는 횡단보도는 세지 않는다 — 151m에서 시작하면 세고, 150m면 안 센다", () => {
        expect(readCrosswalkLeftM({ features: [line(300), line(20, "15"), line(131)] })).toEqual([131]); // 남은 길 151m에서 시작
        expect(readCrosswalkLeftM({ features: [line(300), line(20, "15"), line(130)] })).toEqual([]);    // 남은 길 150m에서 시작
    });
    it("안내점(Point)은 길이가 없으니 건너뛴다 — 횡단보도 안내점이 있어도 선만 센다", () => {
        const raw = { features: [point(200), line(300), point(212), line(20, "15"), point(11), line(400)] };
        expect(readCrosswalkLeftM(raw)).toEqual([400]);
    });
    it("안내점에 distance가 딸려 와도 길이로 치지 않는다 (길은 선뿐이다)", () => {
        const oddPoint = { geometry: { type: "Point" }, properties: { distance: 500, facilityType: "15" } };
        expect(readCrosswalkLeftM({ features: [line(300), oddPoint, line(20, "15"), line(400)] })).toEqual([400]);
    });
    it("거리가 숫자가 아닌 구간은 건너뛴다 — 문자열 \"20\"을 더하면 글자가 이어 붙어 엉뚱한 값이 된다", () => {
        const badCrosswalk = { geometry: { type: "LineString" }, properties: { distance: "20", facilityType: "15" } };
        expect(readCrosswalkLeftM({ features: [line(300), badCrosswalk, line(400)] })).toEqual([]);
        expect(readCrosswalkLeftM({ features: [line(300), line(-20, "15"), line(20, "15"), line(400)] })).toEqual([400]);
    });
    it("facilityType이 숫자 15로 와도 횡단보도로 본다", () => {
        expect(readCrosswalkLeftM({ features: [line(300), line(20, 15), line(400)] })).toEqual([400]);
    });
    it("횡단보도가 없으면 빈 배열", () => {
        expect(readCrosswalkLeftM({ features: [line(300), line(400)] })).toEqual([]);
    });
    it("모양이 다르면 빈 배열 — 요청을 실패로 만들지 않는다 (T맵 에러 본문 · null · 거리가 숫자가 아님)", () => {
        expect(readCrosswalkLeftM({ error: { id: "400", code: "1007" } })).toEqual([]);
        expect(readCrosswalkLeftM(null)).toEqual([]);
        expect(readCrosswalkLeftM({ features: "없음" })).toEqual([]);
        expect(readCrosswalkLeftM({ features: [null, 3, { properties: null }, { geometry: { type: "LineString" }, properties: { distance: "20", facilityType: "15" } }] })).toEqual([]);
    });
});

describe("liveWalkingM — 기준점에서 잰 거리를 지금 자리에 맞게 고치기", () => {
    it("기준점에 그대로 있으면 T맵 거리 그대로", () => {
        expect(liveWalkingM(647, A, A, STATION)).toBe(647);
    });
    it("역 쪽으로 30m → 30m 줄어든다", () => {
        expect(liveWalkingM(647, A, north(30), STATION)).toBe(617);
    });
    it("옆으로 30m → 그래도 길을 따라간 것으로 보고 줄인다 (길은 역을 똑바로 향하지 않을 때가 많다)", () => {
        expect(liveWalkingM(647, A, east(30), STATION)).toBe(619); // 옆으로 가면 역까지 직선거리가 0.9m 늘어 그 두 배만 도로 더해진다
    });
    it("역 반대쪽으로 30m → 30m 늘어난다 (줄지 않는다)", () => {
        expect(liveWalkingM(647, A, north(-30), STATION)).toBe(677);
    });
    it("0보다 작아지지 않는다", () => {
        expect(liveWalkingM(20, A, north(30), STATION)).toBe(0);
    });
});

describe("countCrosswalksAhead — 아직 건너지 않은 횡단보도 수", () => {
    const marks = [419, 17]; // 횡단보도 둘: 건넌 뒤 419m · 17m가 남는다

    it("출발할 때는 둘 다 앞에 있다", () => {
        expect(countCrosswalksAhead(marks, 647)).toBe(2);
    });
    it("남은 거리가 「건넌 뒤 남는 거리」와 같아지는 순간 건넌 것으로 본다 — 420m는 아직, 419m는 건넘", () => {
        expect(countCrosswalksAhead(marks, 420)).toBe(2);
        expect(countCrosswalksAhead(marks, 419)).toBe(1);
    });
    it("다 건너면 0", () => {
        expect(countCrosswalksAhead(marks, 18)).toBe(1);
        expect(countCrosswalksAhead(marks, 17)).toBe(0);
    });
    it("횡단보도가 없으면 0", () => {
        expect(countCrosswalksAhead([], 647)).toBe(0);
    });
});

describe("estimateWalkingM — T맵을 못 불러올 때 직선거리 × 1.3", () => {
    it("직선 200m → 260m (결정.md 1절의 예)", () => {
        const north200 = { lat: 37.6 + (200 / 6371000) * (180 / Math.PI), lng: 127.0 };
        expect(estimateWalkingM({ lat: 37.6, lng: 127.0 }, north200)).toBe(260);
    });
    it("픽스처 출발점 → 공릉역: 직선 454m → 590m (T맵 실제 길은 647m)", () => {
        expect(estimateWalkingM(FROM, GONGNEUNG)).toBe(590);
    });
    it("같은 점이면 0m", () => {
        expect(estimateWalkingM(GONGNEUNG, GONGNEUNG)).toBe(0);
    });
});

describe("toAutoWalk — 내 위치 + T맵 결과 → 화면에 쓸 거리", () => {
    // 픽스처 그대로: 기준점 = 지금 자리 = FROM, 횡단보도 하나(건넌 뒤 419m)
    const from = (accuracy: number) => ({ ...FROM, accuracy, anchor: FROM });
    const ROUTE: RouteResult = { status: "ok", distanceM: 647, crosswalkLeftM: [419] };

    it("아직 답이 없으면 null", () => {
        expect(toAutoWalk(from(20), GONGNEUNG, { status: "pending" })).toBeNull();
    });
    it("T맵 답 + 정확도 100m 이하 → 그 거리, 「약」 없음, 앞에 횡단보도 하나", () => {
        expect(toAutoWalk(from(100), GONGNEUNG, ROUTE)).toEqual({ meters: 647, approximate: false, crosswalks: 1 });
    });
    it("T맵 답 + 정확도 100m 넘음 → 그 거리 + 「약」", () => {
        expect(toAutoWalk(from(101), GONGNEUNG, ROUTE)).toEqual({ meters: 647, approximate: true, crosswalks: 1 });
    });
    it("T맵 실패 → 직선거리 × 1.3 + 「약」 (위치가 정확해도). 횡단보도는 알 수 없어 0", () => {
        expect(toAutoWalk(from(5), GONGNEUNG, { status: "failed" })).toEqual({ meters: 590, approximate: true, crosswalks: 0 });
    });
});

describe("toAutoWalk — 기준점에서 움직였을 때 (T맵을 다시 부르기 전)", () => {
    const at = (here: { lat: number; lng: number }, accuracy = 20) => ({ ...here, accuracy, anchor: A });
    const ROUTE: RouteResult = { status: "ok", distanceM: 647, crosswalkLeftM: [419] };

    it("역 쪽으로 30m 걸으면 거리가 30m 줄고, 횡단보도는 아직 앞에 있다", () => {
        expect(toAutoWalk(at(north(30)), STATION, ROUTE)).toEqual({ meters: 617, approximate: false, crosswalks: 1 });
    });
    it("남은 거리가 419m 아래로 내려가면 횡단보도를 건넌 것으로 본다", () => {
        expect(toAutoWalk(at(north(230)), STATION, ROUTE)).toEqual({ meters: 417, approximate: false, crosswalks: 0 });
    });
    it("「약」은 기준점이 아니라 지금 자리의 정확도로 정한다", () => {
        expect(toAutoWalk(at(north(30), 150), STATION, ROUTE)).toMatchObject({ meters: 617, approximate: true });
    });
    it("T맵 실패면 기준점과 상관없이 지금 자리에서 어림한다 — 역까지 직선 470m × 1.3 = 611m", () => {
        expect(toAutoWalk(at(north(30)), STATION, { status: "failed" })).toEqual({ meters: 611, approximate: true, crosswalks: 0 });
    });
});
