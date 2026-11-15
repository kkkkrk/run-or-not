import type { TrainIconProps, TrainKind } from "@/types/ui";
import { Person } from "./person";
import styles from "./character.module.css";

/** 화면 낭독기가 읽는 말. 화면에는 글자 태그를 쓰지 않고 여기에만 남긴다 (결정.md 3절) */
const LABEL: Record<TrainKind, string> = {
    walk: "걸어도 타요",
    slow: "천천히 걸어도 타요",
    run: "뛰면 타요",
    tight: "아슬아슬",
    miss: "못 타요",
};

/**
 * 가운데 캐릭터 그림(200 × 220)에서 잘라 쓰는 가로 범위 [왼쪽, 오른쪽].
 * 세로는 늘 y 44~220(176칸)이라 어느 아이콘이든 선 굵기가 같다. 뛰는 아이콘은 몸 뒤 두 줄이 들어가게 왼쪽이 넓다
 */
const CROP: Record<TrainKind, [number, number]> = {
    walk: [34, 156],
    slow: [34, 156],
    run: [-10, 156],
    tight: [-10, 156],
    miss: [40, 160],
};
const CROP_TOP = 44;
const CROP_HEIGHT = 176;

/** 사람 아래 바닥선의 가로 범위. 자세마다 다르다 — 못 타요는 앉은 사람의 손과 발이 선에 닿게 길다 (결정.md 3절) */
const FLOOR: Record<TrainKind, [number, number]> = {
    walk: [52, 126],
    slow: [52, 126],
    run: [60, 136],
    tight: [60, 136],
    miss: [44, 156],
};
const FLOOR_Y = 210;

/**
 * 열차 줄 아이콘 — 열차 줄 오른쪽의 작은 사람 (결정.md 3절, v32 mini()).
 * 그림은 셋(걷는 사람 · 뛰는 사람 + 두 줄 · 앉아서 이마 짚은 사람)이고 한 바퀴 속도로 다섯을 나눈다.
 * 판정 대상 열차는 크기로만 구분한다 (42px, 나머지 28px). 못 타요는 isTarget과 상관없이 36.4px이다.
 */
export function TrainIcon({ kind, isTarget }: TrainIconProps) {
    const [left, right] = CROP[kind];
    const [floorLeft, floorRight] = FLOOR[kind];
    const running = kind === "run" || kind === "tight";

    return (
        <span className={styles.slot}>
            <svg
                className={`${styles.figure} ${styles.icon} ${styles[kind]}${isTarget ? ` ${styles.target}` : ""}`}
                viewBox={`${left} ${CROP_TOP} ${right - left} ${CROP_HEIGHT}`}
                role="img"
                aria-label={LABEL[kind]}
            >
                <line className={styles.floor} x1={floorLeft} x2={floorRight} y1={FLOOR_Y} y2={FLOOR_Y} />

                {/* 뛸 때만: 몸 뒤로 흐르는 두 줄 (가운데 캐릭터의 두 줄과 같은 자리) */}
                {running && (
                    <g className={styles.streak}>
                        <line x1={30} x2={58} y1={92} y2={92} />
                        <line x1={18} x2={52} y1={122} y2={122} />
                    </g>
                )}

                <Person />
            </svg>
        </span>
    );
}
