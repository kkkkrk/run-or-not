import { TrainVerdict, Verdict } from "@/lib/verdict"
import { formatRemaining } from "./verdict-card"

// 줄 모양: missed는 흐리게 작게, main은 강조, 나머지는 보통
type RowStyle = "missed" | "main" | "normal";

const KIND_LABEL: Record<TrainVerdict["kind"], string> = {
    slow: "천천히 걸어요",
    walk: "걸어도 돼요",
    run: "지금 뛰어요!",
    tight: "빨리 뛰어봐요!",
    miss: "탈 열차가 아직 안 보여요",
};
const KIND_COLOR: Record<TrainVerdict["kind"], string> = {
    slow: "text-[#10B981]",  // L3 전까지 walk처럼
    walk: "text-[#10B981]",
    run: "text-red-500",
    tight: "text-red-500",   // L3 전까지 run처럼
    miss: "text-slate-400",
};
const ROW_CLASS: Record<RowStyle, string> = {
    missed: "py-1 text-sm opacity-50",
    main: "py-3 px-3 -mx-3 rounded-xl bg-slate-100 text-lg font-bold",
    normal: "py-2 text-base",
};

export function ArrivalList({ verdict, now }: {
    verdict: Verdict;
    now: number;
}) {
    let rows: { train: TrainVerdict; style: RowStyle }[];

    switch (verdict.kind) {
        case "slow":
        case "walk":
        case "run":
        case "tight":
            rows = [
                ...verdict.missed.map((train) => ({ train, style: "missed" as const })),
                { train: verdict.main, style: "main" as const },
                ...verdict.later.map((train) => ({ train, style: "normal" as const })),
            ];
            break;
        case "keep-walking":
            // 전부 miss. 강조할 열차가 없으니 보통 줄로 보여 준다
            rows = verdict.trains.map((train) => ({ train, style: "normal" as const }));
            break;
        case "empty":
            return null;
        default: {
            const unreachable: never = verdict;
            throw new Error(`알 수 없는 판정: ${JSON.stringify(unreachable)}`);
        }
    }

    // 다음 갱신 전에 이미 지나간 열차는 숨긴다
    const visible = rows
        .map((row) => ({ ...row, sec: (row.train.arrival.arrivalAt - now) / 1000 }))
        .filter((row) => row.sec > 0);

    if (visible.length === 0) return null;

    return (
        <ul className="mx-4 mb-6 divide-y divide-slate-100">
            {visible.map(({ train, style, sec }) => (
                <li
                    key={train.arrival.trainNo}
                    className={`flex items-center justify-between ${ROW_CLASS[style]}`}
                >
                    <span className="text-slate-700">{train.arrival.destination}행</span>
                    <span className="flex items-center gap-3">
                        <span className="tabular-nums text-slate-600">{formatRemaining(sec)}</span>
                        <span className={`w-20 text-right ${KIND_COLOR[train.kind]}`}>
                            {KIND_LABEL[train.kind]}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    )
}
