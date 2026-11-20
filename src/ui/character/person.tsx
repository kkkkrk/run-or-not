import styles from "./character.module.css";

/*
 * 사람 뼈대 — 가운데 캐릭터와 열차 줄 아이콘이 같이 쓰는 그림 (v32 스크립트 2의 RIG · person(). 생김새는 v19 그대로)
 *
 * 좌표는 viewBox 200 × 220 기준이다. 엉덩이에서 시작해 관절마다 <g data-part="…">를 두고,
 * 팔다리는 그 <g>의 원점에서 아래로 뻗는 선 하나다. character.module.css가 <g>를 돌려서 자세와 움직임을 만든다.
 *   bob = 몸 전체 오르내림 · lean = 윗몸 기울기(뒤쪽 팔과 앞쪽 윗몸에 하나씩) · head = 고개
 *   leg · arm 뒤의 F = 앞쪽(Front), B = 뒤쪽(Back). 뒤쪽을 먼저 그려서 앞쪽에 가려지게 한다
 * 이 파일에는 움직임도 색도 없다. 길이만 있다.
 */

/** 몸 치수. 세로 위치는 엉덩이 기준이고 위쪽이 음수다 */
const RIG = {
    head: 17,       // 머리 반지름
    headY: -63,     // 머리 중심
    neck: -44,      // 목 = 몸통 선의 끝이자 고개가 도는 자리
    shoulder: -40,  // 어깨 = 팔이 도는 자리
    upperArm: 26,
    lowerArm: 24,
    thigh: 36,
    shin: 36,
};

/** 엉덩이 자리 (95, 129) — v32의 HIP_Y = 212(바닥선) − 다리 길이 − 11 */
const HIP = { x: 95, y: 212 - (RIG.thigh + RIG.shin) - 11 };

type Side = "F" | "B";

/** 원점에서 아래로 뻗는 선 하나 (length가 음수면 위로) */
const limb = (length: number, className = styles.limb) => (
    <line className={className} x1={0} y1={0} x2={0} y2={length} />
);

/** 팔: 어깨 → 위팔 → 팔꿈치 → 아래팔 */
const arm = (side: Side) => (
    <g transform={`translate(0 ${RIG.shoulder})`}>
        <g data-part={`arm${side}-upper`}>
            {limb(RIG.upperArm)}
            <g transform={`translate(0 ${RIG.upperArm})`}>
                <g data-part={`arm${side}-lower`}>{limb(RIG.lowerArm)}</g>
            </g>
        </g>
    </g>
);

/** 다리: 엉덩이 → 허벅지 → 무릎 → 정강이 */
const leg = (side: Side) => (
    <g data-part={`leg${side}-thigh`}>
        {limb(RIG.thigh)}
        <g transform={`translate(0 ${RIG.thigh})`}>
            <g data-part={`leg${side}-shin`}>{limb(RIG.shin)}</g>
        </g>
    </g>
);

/** 사람 한 명. <svg> 안에 넣어 쓴다 (자세 클래스는 바깥 <svg>에 붙인다) */
export function Person() {
    return (
        <g transform={`translate(${HIP.x} ${HIP.y})`}>
            <g data-part="bob">
                <g className={styles.back}>
                    <g data-part="lean">{arm("B")}</g>
                    {leg("B")}
                </g>
                <g>
                    {leg("F")}
                    <g data-part="lean">
                        {limb(RIG.neck, `${styles.limb} ${styles.torso}`)}
                        <g transform={`translate(0 ${RIG.neck})`}>
                            <g data-part="head">
                                <circle className={styles.head} cx={0} cy={RIG.headY - RIG.neck} r={RIG.head} />
                            </g>
                        </g>
                        {arm("F")}
                    </g>
                </g>
            </g>
        </g>
    );
}
