import { useId } from "react";
import type { CharacterProps } from "@/types/ui";
import { Person } from "./person";
import styles from "./character.module.css";

/** 바닥 점선: 길이 22짜리 선을 38마다 하나씩(간격 16), y 212에. 뒤로 흘러도 빈 곳이 없게 화면 밖까지 깐다 */
const DASH_STARTS = [-35, 3, 41, 79, 117, 155, 193, 231];
const DASH_LENGTH = 22;
const GROUND_Y = 212;

/** 바닥이 보이는 범위: x 52~148. 그 안에서도 양끝 22%는 흐려진다 (결정.md 3절) */
const GROUND_VIEW = { x: 52, y: 196, width: 96, height: 32 };

/**
 * 가운데 캐릭터 — 판정 글자와 열차 카드 사이의 큰 사람 (결정.md 3절, v32 runner()).
 * 크기는 부모 높이를 따르고, 색은 조상의 --screen-bg · data-tone="white"를 따른다 (character.module.css 맨 위).
 * 판정 글자가 같은 뜻을 말하므로 화면 낭독기에는 읽히지 않게 한다.
 */
export function Character({ pose }: CharacterProps) {
    // 바닥 양끝을 흐리게 하는 가림막(mask)과 그 색 번짐(gradient)은 id로 이어진다.
    // 한 페이지에 캐릭터가 여럿이어도(미리보기) id가 겹치지 않게 React가 만들어 주는 값을 쓴다
    const id = useId();
    const fadeId = `${id}-fade`;
    const maskId = `${id}-mask`;
    const running = pose === "run" || pose === "tight";

    return (
        <svg
            className={`${styles.figure} ${styles.character} ${styles[pose]}`}
            viewBox="0 0 200 220"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id={fadeId}
                    gradientUnits="userSpaceOnUse"
                    x1={GROUND_VIEW.x}
                    x2={GROUND_VIEW.x + GROUND_VIEW.width}
                    y1={0}
                    y2={0}
                >
                    <stop offset={0} stopColor="#fff" stopOpacity={0} />
                    <stop offset={0.22} stopColor="#fff" />
                    <stop offset={0.78} stopColor="#fff" />
                    <stop offset={1} stopColor="#fff" stopOpacity={0} />
                </linearGradient>
                <mask id={maskId} maskUnits="userSpaceOnUse" {...GROUND_VIEW}>
                    <rect {...GROUND_VIEW} fill={`url(#${fadeId})`} />
                </mask>
            </defs>

            {/* 바닥: 가림막은 제자리에 있고 그 안의 점선만 뒤로 흐른다 (서 있기 · 폰 보기는 흐르지 않음) */}
            <g mask={`url(#${maskId})`}>
                <g className={styles.ground} data-part="ground">
                    {DASH_STARTS.map((x) => (
                        <line key={x} x1={x} x2={x + DASH_LENGTH} y1={GROUND_Y} y2={GROUND_Y} />
                    ))}
                </g>
            </g>

            {/* 뛸 때만: 몸 뒤로 흐르는 두 줄 (열차 줄 아이콘의 두 줄과 같은 자리) */}
            {running && (
                <g className={styles.speed}>
                    <line x1={30} x2={58} y1={92} y2={92} />
                    <line x1={18} x2={52} y1={122} y2={122} />
                </g>
            )}

            <Person />
        </svg>
    );
}
