// src/lib/stations.ts
// 역 조회·검색. 서버(page·route)와 브라우저(검색·즐겨찾기) 양쪽에서 import한다
// → 'server-only'를 붙이지 않는다. React·스토어·브라우저 API를 import하지 않는다
import stationsJson from "@/data/stations.json";
import type { Direction, StationWithNext } from "@/types/subway";
import { NEARBY_RADIUS_M } from "./nearby";

// stations.json의 역마다 방향별 다음 역(next)이 들어 있다 (scripts/build-stations.ts) → 역명판 양옆 칸
export const allStations: StationWithNext[] = stationsJson;
/** 비교용 문자열로 바꾼다. 역 이름과 검색어에 같은 규칙을 쓴다 */

/** id로 역 하나를 찾는다. 없으면 undefined (404 판단은 부른 쪽이 한다) */
export function getStation(id: string): StationWithNext | undefined {
    return allStations.find((station)=> (station.id === id))
}

/** 검색어로 역을 찾는다. 앞부분 일치 먼저, 그다음 포함. 최대 limit개 */
/** 비교용 문자열과 「key 자리 → 원래 이름 자리」 표를 같이 만든다.
 *  역 이름과 검색어에 같은 규칙을 쓴다 (검색어는 key만 쓴다) */
function normalize(text: string): { key: string; origIndex: number[] } {
    let key = "";
    const origIndex: number[] = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (!/[가-힣0-9a-zA-Z]/.test(ch)) continue; // 지우는 글자는 표에도 안 적는다
        key += ch.toLowerCase();                     // 한 글자 → 한 글자 (길이가 바뀌는 변환을 넣으면 이 표가 깨진다)
        origIndex.push(i);                           // key의 이 글자는 원래 i번째였다
    }
    return { key, origIndex };
}

/** 로드 때 한 번: 역마다 key와 번호표 */
const searchIndex = allStations.map((station) => ({
    station,
    ...normalize(station.name),
}));

export type StationMatch = {
    station: StationWithNext;
    matchStart: number;   // station.name 기준
    matchLength: number;
};

/** 검색어로 역을 찾는다. 앞부분 일치 먼저, 그다음 포함. 최대 limit개 */
export function searchStations(query: string, limit = 20): StationMatch[] {
    const q = normalize(query).key.replace(/역$/, "");
    if (!q) return [];

    return searchIndex
        .map((entry) => ({ entry, keyIdx: entry.key.indexOf(q) }))  // indexOf 한 번으로 「맞나」와 「어디서」를 같이
        .filter(({ keyIdx }) => keyIdx !== -1)
        .sort((a, b) => Number(b.keyIdx === 0) - Number(a.keyIdx === 0)) // 앞부분 일치 먼저 (같으면 원래 순서 유지)
        .slice(0, limit)
        .map(({ entry, keyIdx }) => {
            const start = entry.origIndex[keyIdx];
            const end = entry.origIndex[keyIdx + q.length - 1];     // 마지막으로 맞은 글자의 원래 자리
            return {
                station: entry.station,
                matchStart: start,
                matchLength: end - start + 1,                       // 가운데 지워진 점까지 포함 → 「419」는 「4.19」 4글자
            };
        });
}


const UP_ON_RIGHT_LINES = ["1002", "1009", "1092"];
export const rightDirSelect = (subwayId:string):Direction => {
    if(UP_ON_RIGHT_LINES.includes(subwayId)){
        return "up";
    }
    return "down"
}

export function stationHref(stationId: string, dir: Direction): string {
    return `/station/${stationId}?dir=${dir}`;
}

function getDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRad = Math.PI / 180;

    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;

    const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) *
        Math.cos(lat2 * toRad) *
        Math.sin(dLon / 2) ** 2;

    return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

export function findNearbyStation(lat: number, lng: number):{station:StationWithNext, distanceM:number}[] {
    return allStations.flatMap((station)=>{
        const distanceM = getDistance(station.lat, station.lng, lat, lng);
        if(distanceM > NEARBY_RADIUS_M) return [];
        return {station, distanceM};
    }).sort((a,b) => a.distanceM - b.distanceM).slice(0,3);
}