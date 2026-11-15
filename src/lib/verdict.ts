// lib/verdict.ts
import type { Arrival } from "@/types/subway";

export type VerdictSettings = {
    walkSpeed: number;          // m/s
    runSpeed: number;           // m/s
    stationOverheadSec: number; // 입구 → 승강장 
    //TODO: 역마다 다른 가중치로 바꿔야함
    marginSec: number;          // 걸어도 돼 여유 기준
};
export type WalkInput = { meters: number } | { walkSec: number }; // 위치 허용 / 거부(수동 입력)
export type TrainVerdict = {
    arrival: Arrival;
    kind: "slow" | "walk" | "run" | "miss" | "tight";
    remainingSec: number; 
    walkNeedSec: number; 
    runNeedSec: number; 
};
export type Verdict =
    | { kind: "empty" }                                                     // 보이는 열차 0대
    | { kind: "slow" | "walk" | "run" | "tight"; main: TrainVerdict; missed: TrainVerdict[]; later: TrainVerdict[] }
    | { kind: "keep-walking"; trains: TrainVerdict[]; platformAt: number }; // 일단 걸어가요

const TIGHT_SEC = 20;
const SLOW_SEC = 20;

function ceilSec(input: number): number{
    return Math.ceil(input - 1e-9);
}
export function needSeconds(input:WalkInput, s:VerdictSettings): {walk: number; run: number}{
    if("meters" in input){
        const walkSec = ceilSec(input.meters / (s.walkSpeed / 3.6) + s.stationOverheadSec);
        const runSec = ceilSec(input.meters / (s.runSpeed / 3.6) + s.stationOverheadSec);
        return {walk: walkSec, run: runSec};
    }
    if(input.walkSec <= s.stationOverheadSec) return {walk: ceilSec(input.walkSec), run: ceilSec(input.walkSec)};
    const runSec = ceilSec(((input.walkSec - s.stationOverheadSec) * (s.walkSpeed / 3.6)) / (s.runSpeed / 3.6) + s.stationOverheadSec);
    return {walk: ceilSec(input.walkSec), run: runSec};
}

export function judgeTrain(
    arrival: Arrival, 
    now: number, 
    need: {walk: number;run: number}, 
    s:VerdictSettings): TrainVerdict
{
    let kind:"slow" | "walk" | "run" | "miss" | "tight";
    const remainingSec = (arrival.arrivalAt - now) / 1000;
    if(remainingSec>= need.walk + s.marginSec){
        kind = remainingSec >= need.walk + SLOW_SEC ? "slow" : "walk";
    } else if(remainingSec >= need.run + TIGHT_SEC){
        kind = "run";
    } else if(remainingSec >= need.run - TIGHT_SEC){
        kind = "tight";
    }else{
        kind = "miss";
    }
    return {
        arrival,
        kind,
        remainingSec,
        walkNeedSec: need.walk,
        runNeedSec: need.run
    }
}
export function judge(
    arrivals: Arrival[],
    now: number,
    input: WalkInput,
    s: VerdictSettings): Verdict
{
    const need = needSeconds(input, s);

    const arrivalList = arrivals
        .map(arrival => judgeTrain(arrival, now, need, s))
        .filter(train => train.remainingSec > 0) // 이미 도착한 열차(남은 시간 0 이하)는 없는 열차로 친다
        .sort((a, b) => a.remainingSec - b.remainingSec);

    // 지난 열차를 뺀 뒤에 0대인지 센다
    if (!arrivalList.length) return { kind: "empty" };

    const missed: TrainVerdict[] = [];
    const later: TrainVerdict[] = [];
    let main: TrainVerdict | undefined;

    for (const arrival of arrivalList) {
        if (main === undefined && arrival.kind !== "miss") {
            main = arrival;
        }
        if (main === undefined) {
            missed.push(arrival);
        }
        else if (arrival !== main) {
            later.push(arrival);
        }
    }
    if (main === undefined) {
        return {
            kind: "keep-walking",
            trains: arrivalList,
            platformAt: now + need.walk * 1000 // 지금부터 걸어갔을 때 도착 예상 시각
        };
    } else {
        return {
            kind: main.kind as "slow" | "walk" | "run" | "tight",
            main,
            missed,
            later
        };
    }
}