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
    kind: "walk" | "run" | "miss";
    remainingSec: number; 
    walkNeedSec: number; 
    runNeedSec: number; 
};
export type Verdict =
    | { kind: "empty" }                                                     // 보이는 열차 0대
    | { kind: "walk" | "run"; main: TrainVerdict; missed: TrainVerdict[]; later: TrainVerdict[] }
    | { kind: "keep-walking"; trains: TrainVerdict[]; platformAt: number }; // 일단 걸어가요

function ceilSec(input: number): number{
    return Math.ceil(input - 1e-9);
}
export function needSeconds(input:WalkInput, s:VerdictSettings): {walk: number; run: number}{
    if("meters" in input){
        const walkSec = ceilSec(input.meters / s.walkSpeed + s.stationOverheadSec);
        const runSec = ceilSec(input.meters / s.runSpeed + s.stationOverheadSec);
        return {walk: walkSec, run: runSec};
    }
    const runSec = ceilSec((input.walkSec * s.walkSpeed) / s.runSpeed + s.stationOverheadSec);
    return {walk: ceilSec(input.walkSec + s.stationOverheadSec), run: runSec};
}

export function judgeTrain(
    arrival: Arrival, 
    now: number, 
    need: {walk: number;run: number}, 
    s:VerdictSettings): TrainVerdict
{
    let kind:"walk" | "run" | "miss";
    const remainingSec = (arrival.arrivalAt - now) / 1000;
    if(remainingSec>= need.walk + s.marginSec){
        kind = "walk";
    } else if(remainingSec >= need.run){
        kind = "run";
    } else{
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
    s:VerdictSettings):Verdict
{
    if(!arrivals.length) return { kind: "empty" };
    const need = needSeconds(input, s);
    
    const arrivalList = arrivals
        .map(arrival => judgeTrain(arrival, now, need,s))
        .sort((a,b) => a.remainingSec - b.remainingSec);
    
    const missed:TrainVerdict[] = [];
    const later:TrainVerdict[] = [];
    let main:TrainVerdict | undefined;


    for(const arrival of arrivalList){
        if(main === undefined && arrival.kind !== "miss"){
            main = arrival;
        }
        if(main === undefined){
            missed.push(arrival);
        }
        else if(arrival !== main){
            later.push(arrival);
        }
    }
    if(main === undefined){
        return { 
            kind: "keep-walking",
            trains: arrivalList,
            platformAt: now + need.walk * 1000 //지금부터 걸어갔을 때 도착 예상 시각
        };
    } else{
        return {
            kind: main.kind as "walk" | "run",
            main,
            missed,
            later
        }
    }
}