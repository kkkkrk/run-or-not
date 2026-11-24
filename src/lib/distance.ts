// src/lib/distance.ts
// 두 좌표 사이의 직선거리(m). 세 곳이 같이 쓴다
//   가까운 역 찾기 (stations.ts) · 「100m 넘게 움직였나」 (geo-state.ts) · T맵을 못 불러올 때 어림 (walking.ts)
// stations.ts에 있던 getDistance를 그대로 옮겼다 (계산은 한 글자도 바꾸지 않았다)

const EARTH_RADIUS_M = 6371000; // 지구 반지름 (m)

/** 하버사인 공식 — 지구를 공으로 보고, 공 겉면을 따라 두 점 사이의 가장 짧은 길이를 잰다 */
export function getDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRad = Math.PI / 180; // 도(°) → 라디안. Math.sin · Math.cos는 라디안만 받는다

    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;

    const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) *
        Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) ** 2;

    return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}
