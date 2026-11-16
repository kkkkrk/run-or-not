import { mkdir, writeFile } from "node:fs/promises"
import type { Direction } from "@/types/subway";
import { toDirection } from "@/lib/arrivals";

const key = process.env.SEOUL_API_KEY;
if(!key) throw new Error("API 키가 없어요");

const url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/ALL`;
const res = await fetch(url);
const data = await res.json();

const list = data.realtimeArrivalList;
if(!Array.isArray(list) || list.length === 0){
    console.error("응답이상", data.errorMessage ?? data);
    process.exit(1);
}

type RealtimeArrival = {
    subwayId: string;
    trainLineNm: string;
    statnNm: string;
    updnLine: string;
}
const neighbors:Record<string, Record<Direction, string[]>> = {};

data.realtimeArrivalList.forEach((station: RealtimeArrival) => {
    // console.log(station.subwayId, station.trainLineNm, station.statnNm, station.updnLine+"\n")
    const key = `${station.statnNm}-${station.subwayId}`;
    const dir = toDirection(station.updnLine);
    if(dir === null) throw new Error("상행, 하행, 내선, 외선이 아닙니다.");
    neighbors[key] ??= {up: [], down: []};
    if(neighbors[key][dir].length === 0) neighbors[key][dir].push(station.trainLineNm)
})

const path = `scripts/raw/neighbors.json`;

await mkdir("scripts/raw", {recursive: true});
await writeFile(path, JSON.stringify(neighbors, null, 2) + "\n");
console.log(`${list.length}행 저장 => ${path}`);