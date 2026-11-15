import type { TrainCardProps, TrainRow } from "@/types/ui";
import { TrainIcon } from "@/ui/character/train-icon";
import { formatDuration, formatTrainTime, roundTo10 } from "@/ui/shared/format";
import { PlatformTimeRow } from "./platform-time-row";
import { RefreshButton } from "./refresh-button";

/**
 * 줄 이름은 위에서부터 순서대로 붙인다. 대기 줄도 이어서 — 열차 줄이 둘이면 「그다음 열차」, 하나면 「다음 열차」 (결정.md 4절).
 * 열차 줄은 많아야 2개다(3대 이상은 로직이 앞의 2대만 넘긴다). 그래도 더 오면 셋째부터는 전부 「그다음 열차」로 쓴다
 */
const ROW_NAMES = ["이번 열차", "다음 열차", "그다음 열차"];
const rowName = (index: number) => ROW_NAMES[Math.min(index, ROW_NAMES.length - 1)];

/** 줄 공통: 안쪽 여백 위아래 13px · 좌우 15px (크기 클래스의 숫자 × 4 = 시안의 px) */
const ROW = "px-3.75 py-3.25";
/** 둘째 줄부터 위에 붙는 가는 구분선 (::before, 좌우 15px 안쪽). 첫 줄 위는 「승강장까지」 줄의 어두운 면이 대신 나눈다 */
const DIVIDER = "relative before:absolute before:inset-x-3.75 before:top-0 before:h-px before:bg-on-line";
/** 이름 글자 (이번 열차 · 다음 열차). 옆의 작은 글자(뛰어도 N 부족 · 이번 열차가 떠나면 보여요)는 이름 뒤 7px · 굵기 600 */
const NAME = "text-12.5 font-bold text-on-sub";
const NOTE = "ml-1.75 font-semibold";
/** 못 타는 줄은 지우지 않고 흐리게 (62%). 같은 줄의 새로고침 글자는 누르는 버튼이라 흐리게 하지 않는다 */
const DIM = "opacity-62";

/** 이름 + (못 타는 줄이면) 「뛰어도 N 부족」 */
const nameLine = (train: TrainRow, index: number) => {
    const missed = train.kind === "miss";
    return (
        <>
            <span className={missed ? DIM : undefined}>{rowName(index)}</span>
            {missed && (
                <span className={`${NOTE} ${DIM}`}>뛰어도 {formatDuration(roundTo10(train.shortBySec))} 부족</span>
            )}
        </>
    );
};

/** 남은 시간. 판정 대상 열차만 크게, 못 타는 열차는 흐리게 */
const remainingTime = (train: TrainRow) => {
    const size = train.kind !== "miss" && train.isTarget ? "text-train-target" : "text-train";
    return (
        <b className={`block tabular-nums ${size} ${train.kind === "miss" ? DIM : ""}`}>
            {formatTrainTime(train.remainingSec)}
        </b>
    );
};

/** 열차 줄 아이콘. 못 타는 열차는 판정 대상이 될 수 없다 */
const rowIcon = (train: TrainRow) => (
    <TrainIcon kind={train.kind} isTarget={train.kind !== "miss" && train.isTarget} />
);

/**
 * 열차 카드 — 「승강장까지」 줄 + 열차 줄 + 새로고침 글자 + 대기 줄 (결정.md 1절 · 4절, v32 CSS 7절 .vA).
 *
 * 줄 구조 (v31 1안)
 *   첫 줄(「이번 열차」) = 윗줄(이름 · 「뛰어도 N 부족」 | 오른쪽 끝에 새로고침) + 아랫줄(시간 | 아이콘)
 *   다른 줄            = (이름 + 시간) 덩어리 | 아이콘
 *   아이콘은 어느 줄에서나 아래쪽에 맞춘다(items-end) — 아이콘 바닥선이 시간 글자 아래쪽과 나란하다.
 *   그래서 첫 줄이 못 타는 줄이면(못 타요 아이콘 36.4px) 그 줄만 12px쯤 높아진다.
 */
export function TrainCard({ platformTime, trains, refresh, showPendingRow }: TrainCardProps) {
    const [first, ...rest] = trains;

    return (
        <div className="overflow-hidden rounded-[20px] bg-on-fill">
            <PlatformTimeRow {...platformTime} />

            <ul>
                <li className={ROW}>
                    <div className="mb-1 flex items-center justify-between gap-2.5">
                        <span className={`min-w-0 ${NAME}`}>{nameLine(first, 0)}</span>
                        <RefreshButton {...refresh} />
                    </div>
                    <div className="flex items-end justify-between gap-2.5">
                        {remainingTime(first)}
                        {rowIcon(first)}
                    </div>
                </li>

                {rest.map((train, i) => (
                    // 줄마다 고유한 값이 props에 없어서 순서를 key로 쓴다. 줄 안에 기억하는 상태가 없어 순서가 바뀌어도 괜찮다
                    <li key={i} className={`${ROW} ${DIVIDER} flex items-end justify-between gap-2.5`}>
                        <div>
                            <span className={`mb-1 block ${NAME}`}>{nameLine(train, i + 1)}</span>
                            {remainingTime(train)}
                        </div>
                        {rowIcon(train)}
                    </li>
                ))}

                {/* 대기 줄 (탈 열차가 아직 안 보여요): 숫자가 들어올 자리에 작은 점 세 개. 움직이지 않는다 — 애니메이션은 캐릭터만 */}
                {showPendingRow && (
                    <li className={`${ROW} ${DIVIDER}`}>
                        <span className={`mb-2 block ${NAME}`}>
                            {rowName(trains.length)}
                            <span className={NOTE}>이번 열차가 떠나면 보여요</span>
                        </span>
                        <span aria-hidden="true" className="flex gap-1.75 pb-0.75">
                            <i className="size-1.75 rounded-full bg-white/55" />
                            <i className="size-1.75 rounded-full bg-white/55" />
                            <i className="size-1.75 rounded-full bg-white/55" />
                        </span>
                    </li>
                )}
            </ul>
        </div>
    );
}
