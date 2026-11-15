/*
 * 표시 형식 — 로직이 넘긴 숫자(초)를 화면 글자로 바꾸는 곳 (plan.md 1-2 「경계 판단 기준」)
 * 기준: design/결정.md 1절 · 4절, design/v32.html 스크립트 1절(fmt · fmtTrain · r10)과 3절(rfLabel).
 *
 * 여기에는 판정도 임계값 비교도 없다. 60초가 넘었는지(stale) 같은 비교는 로직이 끝내고 넘긴다.
 * 초는 소수로 들어올 수 있어서(ui.ts 맨 위 원칙) 글자로 쓰기 직전에 여기서 정수로 만든다.
 */

/**
 * 10초 단위로 반올림 — 「승강장까지」의 걸으면 · 뛰면, 「뛰어도 N 부족」 (결정.md 1절 「화면 표시는 10초 단위 반올림」).
 * 195 → 200, 194 → 190
 */
export function roundTo10(sec: number): number {
    return Math.round(sec / 10) * 10;
}

/**
 * 초 → 「50초」 · 「3분」 · 「3분20초」. 0인 쪽은 쓰지 않는다 (둘 다 0이면 「0초」).
 * 「승강장까지」 줄과 「뛰어도 N 부족」처럼 짧게 쓰는 곳에 쓴다. 보통 roundTo10을 거친 값을 넣는다
 */
export function formatDuration(sec: number): string {
    const total = Math.max(0, Math.round(sec));
    const min = Math.floor(total / 60);
    const rest = total % 60;
    if (min === 0) return `${rest}초`;
    return rest === 0 ? `${min}분` : `${min}분${rest}초`;
}

/**
 * 초 → 「0분50초」 · 「2분30초」 · 「3분」. 열차 남은 시간은 1분이 안 돼도 분을 늘 쓴다 (v32 「시간 표기」).
 * 소수는 버린다(내림): 실제보다 길게 보여 주면 놓칠 수 있어서 짧은 쪽으로 보여 준다 — 영준이 T1에서 정한 규칙 그대로
 */
export function formatTrainTime(sec: number): string {
    const total = Math.max(0, Math.floor(sec));
    const min = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0 ? `${min}분` : `${min}분${rest}초`;
}

/**
 * 마지막으로 받은 지 몇 초 → 「방금」(10초 안) · 「10초 전」 · 「20초 전」… (결정.md 4절 「새로고침」).
 * 1초마다 세지 않고 10초 단위로 내린다. 「1분 전 정보」는 여기서 만들지 않는다 —
 * 60초 이상인지는 로직이 stale로 알려 주고, 그 글자는 새로고침 버튼이 쓴다
 */
export function formatElapsed(sec: number): string {
    if (sec < 10) return "방금";
    return `${Math.floor(sec / 10) * 10}초 전`;
}
