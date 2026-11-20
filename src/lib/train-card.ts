import type { Verdict } from "./verdict";
import type { TrainCardProps, TrainRow } from "@/types/ui";

const MAX_ROW = 2;

export function toTrainCard(
    verdict:Exclude<Verdict, {kind: "empty"}> //empty인 경우는 페이지쪽에서 처리
):Pick<TrainCardProps, "trains" | "showPendingRow">{
    if(verdict.kind === "keep-walking") {
        const trains:TrainRow[] = verdict.trains.map((train):TrainRow => ({
            kind: "miss",
            remainingSec: train.remainingSec,
            shortBySec: train.runNeedSec - train.remainingSec,
        }))
        return {trains: trains.slice(0, MAX_ROW), showPendingRow: true};
    }
    const trains = [...verdict.missed, verdict.main, ...verdict.later].map((train):TrainRow => {
        if(train.kind === "miss"){
            return {
                kind: "miss",
                remainingSec: train.remainingSec,
                shortBySec: train.runNeedSec - train.remainingSec,
            }
        }
        return {
            kind: train.kind,
            remainingSec: train.remainingSec,
            isTarget: train === verdict.main
        }
    })
    const mainIndex = verdict.missed.length;
    const start = Math.max(0, mainIndex - 1); // main앞에서 놓친 열차를 최대 1대
    return {trains: trains.slice(start, start + MAX_ROW), showPendingRow: false};
}