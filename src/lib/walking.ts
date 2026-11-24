// src/lib/walking.ts
// 「내 위치에서 역까지 걷는 거리」에 쓰는 순수 함수.
// 서버(app/api/walking/route.ts)와 브라우저(hooks · station-screen) 양쪽에서 import한다
// → 'server-only'를 붙이지 않고, React · 브라우저 API도 쓰지 않는다
import { getDistance } from "./distance";
import type { LatLng, WalkingRequest } from "@/types/walking";

/** 위치 정확도(accuracy)가 이 값을 넘으면 숫자 앞에 「약」 (결정.md 1절 「예외 상태」) */
export const ACCURACY_LIMIT_M = 100;
/** 기준점(마지막으로 T맵을 부른 곳)에서 이 값 넘게 움직이면 다시 부른다 (plan.md 7절 11/21은 100m → 2026-11-24 영준이 50m로) */
export const REROUTE_MOVE_M = 50;
/** 마지막으로 받아들인 위치에서 이 값 넘게 움직여야 새 위치로 본다 — 서 있을 때 GPS 잔떨림으로 숫자가 흔들리지 않게 (2026-11-24) */
export const TRACK_MOVE_M = 10;
/** T맵을 못 불러올 때 직선거리에 곱하는 값. 실제 길은 직선보다 보통 20~40% 길다 (결정.md 1절) */
export const DETOUR_RATE = 1.3;
/** 횡단보도 하나에서 기다린다고 보는 시간(초). T맵이 자기 소요 시간에 더하는 값과 같다 (실제 응답 5개 · 횡단보도 13개에서 확인, 2026-11-24) */
export const CROSSWALK_WAIT_SEC = 30;
/**
 * 역까지 남은 길이 이 값(m) 안일 때 시작하는 횡단보도는 세지 않는다 (2026-11-24).
 * T맵 길은 역 한가운데 좌표까지 가느라 역 앞 큰길을 건너는 것으로 나오지만(「공릉역 1번출구에서 횡단보도」), 실제로는 그 출구로 내려간다.
 * 실제 응답 5개에서 그런 횡단보도는 남은 길 52 · 78 · 125m에서, 진짜 건너는 횡단보도는 258m부터 시작했다
 */
export const STATION_FRONT_M = 150;

/** 내 위치로 계산한 「역까지 걷는 거리」 */
export type AutoWalk = {
    meters: number;        // 지금 자리에서 걷는 거리 (m) — T맵 총거리에서 움직인 만큼 뺀 값, 못 불러왔으면 직선거리 × 1.3
    approximate: boolean;  // 어림값인가 → true면 「승강장까지」 줄의 숫자 앞에 「약」
    crosswalks: number;    // 아직 건너지 않은 횡단보도 수 → 하나에 CROSSWALK_WAIT_SEC초를 더한다. T맵을 못 불러왔으면 알 수 없어 0
};

/** T맵에 물어본 결과 — 훅(use-walking-time)이 TanStack Query의 상태를 이 셋으로 줄여서 넘긴다 */
export type RouteResult =
    | { status: "pending" }                                            // 아직 답이 없다 (묻는 중이거나, 물을 위치가 없다)
    | { status: "ok"; distanceM: number; crosswalkLeftM: number[] }    // T맵 총거리 + 횡단보도마다 「건넌 뒤 남는 거리」
    | { status: "failed" };                                            // 못 불러왔다 (한 번 더 해 봐도 실패 · 오프라인)

/** JSON으로 받은 값이 { ... } 모양인가. null도 typeof가 "object"라서 같이 거른다 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * 브라우저가 보낸 본문이 { stationId, from: { lat, lng } } 모양이면 그 값만 골라 돌려준다. 아니면 null (→ route가 400).
 * 본문은 누구나 아무 값이나 보낼 수 있다 → 타입을 믿지 않고 하나씩 확인한다
 */
export function readWalkingRequest(body: unknown): WalkingRequest | null {
    if (!isRecord(body) || !isRecord(body.from)) return null;
    const { stationId } = body;
    const { lat, lng } = body.from;
    if (typeof stationId !== "string" || stationId === "") return null;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    // 위도는 −90 ~ 90, 경도는 −180 ~ 180. 「범위 안이 아니면」으로 적어서 NaN · Infinity도 같이 걸러진다
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return null;
    return { stationId, from: { lat, lng } }; // 필요한 값만 새로 담는다 (본문에 딸려 온 다른 값은 버린다)
}

/**
 * T맵 보행자 경로 응답에서 총거리(m)를 꺼낸다. 없으면 null (→ route가 502).
 * 총거리는 출발점 feature 하나에만 들어 있다 (보통 features[0]). 자리를 믿지 않고 앞에서부터 찾는다
 */
export function readTotalDistance(raw: unknown): number | null {
    if (!isRecord(raw) || !Array.isArray(raw.features)) return null;
    for (const feature of raw.features) {
        if (!isRecord(feature) || !isRecord(feature.properties)) continue;
        const total = feature.properties.totalDistance;
        if (typeof total === "number" && Number.isFinite(total) && total >= 0) return total;
    }
    return null;
}

const CROSSWALK = "15"; // T맵 facilityType — 횡단보도 구간

/**
 * T맵 보행자 경로 응답에서 횡단보도마다 「다 건넌 뒤 역까지 남는 거리(m)」를 꺼낸다. 길 순서대로(먼 것부터) 돌려준다.
 * - 길은 선(LineString) feature가 차례로 이어진 것이다. 선마다 distance(m)가 있고, facilityType이 "15"면 횡단보도
 * - 역 앞(남은 길 STATION_FRONT_M 안)에서 시작하는 횡단보도는 뺀다
 * - 모양이 다르면 빈 배열. 횡단보도를 모를 뿐이라 요청을 실패로 만들지 않는다 (총거리는 readTotalDistance가 따로 본다)
 */
export function readCrosswalkLeftM(raw: unknown): number[] {
    if (!isRecord(raw) || !Array.isArray(raw.features)) return [];
    const sections: { distance: number; crosswalk: boolean }[] = [];
    for (const feature of raw.features) {
        if (!isRecord(feature) || !isRecord(feature.geometry) || !isRecord(feature.properties)) continue;
        if (feature.geometry.type !== "LineString") continue; // 안내점(Point)은 길이가 없다
        const { distance, facilityType } = feature.properties;
        if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) continue;
        sections.push({ distance, crosswalk: String(facilityType) === CROSSWALK }); // 숫자 15로 와도 같게 본다
    }
    const result: number[] = [];
    let leftM = sections.reduce((sum, section) => sum + section.distance, 0); // 이 구간에 들어설 때 역까지 남은 길
    for (const section of sections) {
        const leftAfterM = leftM - section.distance; // 이 구간을 다 지난 뒤 남는 길
        if (section.crosswalk && leftM > STATION_FRONT_M) result.push(leftAfterM);
        leftM = leftAfterM;
    }
    return result;
}

/** T맵을 못 불러올 때 걷는 거리 어림 (m) = 직선거리 × 1.3 */
export function estimateWalkingM(from: LatLng, to: LatLng): number {
    return Math.round(getDistance(from.lat, from.lng, to.lat, to.lng) * DETOUR_RATE);
}

/**
 * 기준점(T맵에 물어본 자리)에서 잰 걷는 거리를 「지금 자리」에 맞게 고친다 — T맵을 다시 부르지 않고.
 *   지금 거리 = 기준점 거리 − 기준점에서 움직인 직선거리 + 역에서 멀어진 거리 × 2
 * - 역 쪽으로든 옆으로든 움직였으면 그만큼 길을 따라간 것으로 본다 (길은 역을 똑바로 향하지 않을 때가 많다)
 * - 역에서 멀어졌으면(역까지 직선거리가 늘었으면) 그만큼의 두 배를 도로 더한다 → 똑바로 멀어지면 움직인 만큼 「늘어난다」
 * 실제 T맵 길 5개 위를 걷는다고 놓고 재면 평균 7m쯤 어긋난다 (고치지 않으면 28m).
 * 어긋난 것은 기준점에서 REROUTE_MOVE_M 넘게 가서 T맵을 다시 부를 때 사라진다
 */
export function liveWalkingM(anchorM: number, anchor: LatLng, here: LatLng, to: LatLng): number {
    const movedM = getDistance(anchor.lat, anchor.lng, here.lat, here.lng);
    const fartherM = Math.max(
        0,
        getDistance(here.lat, here.lng, to.lat, to.lng) - getDistance(anchor.lat, anchor.lng, to.lat, to.lng),
    );
    return Math.max(0, Math.round(anchorM - movedM + 2 * fartherM));
}

/**
 * 아직 건너지 않은 횡단보도 수.
 * crosswalkLeftM = 횡단보도마다 「다 건넌 뒤 남는 거리」. 그 값이 지금 남은 거리보다 짧으면 아직 내 앞에 있다
 */
export function countCrosswalksAhead(crosswalkLeftM: number[], meters: number): number {
    return crosswalkLeftM.filter((leftM) => leftM < meters).length;
}

/**
 * 내 위치 + T맵 결과 → 화면에 쓸 걷는 거리. 아직 답이 없으면 null.
 * here = 지금 자리와 그 정확도, here.anchor = 기준점(route를 물어본 자리). route는 반드시 그 기준점에서 물은 결과여야 한다.
 * 「약」이 붙는 경우는 둘: T맵을 못 불러와 어림했을 때, 위치 정확도가 100m를 넘을 때
 */
export function toAutoWalk(
    here: LatLng & { accuracy: number; anchor: LatLng },
    to: LatLng,
    route: RouteResult,
): AutoWalk | null {
    switch (route.status) {
        case "pending":
            return null;
        case "failed":
            // 어림은 지금 자리에서 바로 잰다 (기준점이 필요 없다). 횡단보도는 알 수 없다
            return { meters: estimateWalkingM(here, to), approximate: true, crosswalks: 0 };
        case "ok": {
            const meters = liveWalkingM(route.distanceM, here.anchor, here, to);
            return {
                meters,
                approximate: here.accuracy > ACCURACY_LIMIT_M,
                crosswalks: countCrosswalksAhead(route.crosswalkLeftM, meters),
            };
        }
    }
}
