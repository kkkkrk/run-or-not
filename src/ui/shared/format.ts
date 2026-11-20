/*
 * 표시 형식 — 로직이 넘긴 숫자(초 · km/h · m)와 호선 이름을 화면 글자로 바꾸는 곳 (plan.md 1-2 「경계 판단 기준」)
 * 기준: design/결정.md 1절 · 4절 · 6절, 시안 스크립트 1절(fmt · fmtTrain · bigDur · r10) · 3절(rfLabel) · 4절(dist) · 5절(dur · valText · batchim).
 * (시안 = design/v39.html. v32 때 만든 것은 주석에 v32라고 적혀 있다 — 그 부분은 v39에 그대로 들어 있다)
 *
 * 여기에는 판정도 임계값 비교도 없다. 60초가 넘었는지(stale) · 2km 안에 역이 있는지 같은 비교는 로직이 끝내고 넘긴다.
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
 * 초 → 숫자와 단위 조각. 200 → [3 분, 20 초] · 180 → [3 분] · 50 → [50 초]. 0인 쪽은 빼고, 둘 다 0이면 [0 초].
 * 시트의 큰 숫자처럼 숫자와 단위를 따로 꾸미는 곳이 직접 쓰고(v32 bigDur), 한 글자로 붙여 쓰는 곳은 아래 formatDuration이 쓴다.
 * 「어느 쪽을 빼는가」 규칙을 여기 한 곳에만 둬서 시트의 큰 숫자와 「승강장까지」 줄이 늘 같은 모양이 되게 한다
 */
export function durationParts(sec: number): { value: number; unit: "분" | "초" }[] {
    const total = Math.max(0, Math.round(sec));
    const min = Math.floor(total / 60);
    const rest = total % 60;
    if (min === 0) return [{ value: rest, unit: "초" }];
    if (rest === 0) return [{ value: min, unit: "분" }];
    return [
        { value: min, unit: "분" },
        { value: rest, unit: "초" },
    ];
}

/**
 * 초 → 「50초」 · 「3분」 · 「3분20초」. 0인 쪽은 쓰지 않는다 (둘 다 0이면 「0초」).
 * 「승강장까지」 줄과 「뛰어도 N 부족」처럼 짧게 쓰는 곳에 쓴다. 보통 roundTo10을 거친 값을 넣는다
 */
export function formatDuration(sec: number): string {
    return durationParts(sec)
        .map(({ value, unit }) => `${value}${unit}`)
        .join("");
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

/**
 * 초 → 「40초」 · 「1분」 · 「1분 30초」. formatDuration과 같은 규칙이고 분과 초 사이만 띄운다 (v32 스크립트 5절 dur).
 * 설정에서 쓴다: 역 안 이동의 단계 이름, 「직접 · 1분 10초」, 시트의 비교 한 줄
 */
export function formatDurationSpaced(sec: number): string {
    return durationParts(sec)
        .map(({ value, unit }) => `${value}${unit}`)
        .join(" ");
}

/**
 * 속도(km/h) → 소수 한 자리 글자. 4.5 → 「4.5」 · 9 → 「9.0」 (v32 스크립트 5절 toFixed(1)).
 * 설정의 「직접 · 시속 4.8km」와 시트의 큰 숫자가 쓴다. 단위(시속 … km · km/h)는 쓰는 곳에서 붙인다.
 * 0.1씩 더하다 보면 4.799999999999999 같은 값이 올 수 있어서(4.5 + 0.1 + 0.1 + 0.1), 글자로 쓰기 직전에 여기서 한 자리로 만든다
 */
export function formatSpeed(kmh: number): string {
    return kmh.toFixed(1);
}

/** 읽었을 때 받침 소리로 끝나는 숫자: 0(영) · 1(일) · 3(삼) · 6(육) · 7(칠) · 8(팔). 10 · 20처럼 0으로 끝나는 수(십 · 백 · 천)도 받침이 있다 */
const DIGITS_WITH_BATCHIM = "013678";

/**
 * 낱말이 받침 소리로 끝나는지 — 뒤에 붙는 말을 고를 때 쓴다 (v32 스크립트 5절 batchim).
 * 「보통」이에요 / 「빠르게」예요, 「보통」과 / 「빠르게」와, 「강남」과 / 「홍데」와 맞는 역이 없어요.
 * 숫자로 끝나면 읽는 소리로 본다: 「종로6」과(육) · 「을지로5」와(오). 시안의 코드는 숫자를 받침 없음으로 보지만(「종로6」와),
 * 틀린 조사가 나와서 읽는 소리대로 하기로 했다 (2026-11-20 영준 확인).
 * 그 밖의 글자(영문 · 기호 · 낱자 「ㄱ」)로 끝나거나 빈 글자면 받침이 없는 것으로 본다
 */
export function endsWithBatchim(word: string): boolean {
    if (word === "") return false;
    const last = word[word.length - 1];
    if (DIGITS_WITH_BATCHIM.includes(last)) return true;

    const code = last.charCodeAt(0);
    // 한글 음절은 U+AC00(가)부터 28개씩 한 묶음이고, 묶음의 첫 글자(가 · 개 · 갸 …)만 받침이 없다
    return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/**
 * 거리(m) → 「320m」 · 「1.1km」 — 가까운 역 줄의 오른쪽 끝 (결정.md 6절, v39 스크립트 4절 dist).
 * 1km가 안 되면 10m 단위로 반올림하고, 그 위는 km로 소수 한 자리까지 쓴다 (딱 떨어져도 「2.0km」).
 * 어느 쪽으로 쓸지는 10m로 반올림한 값으로 정한다 — 996m는 「1000m」가 아니라 「1.0km」다 (시안의 dist는 「1000m」가 된다).
 * km 숫자는 반올림한 값이 아니라 받은 값에서 바로 구한다 (1049m를 1050m로 올린 뒤 다시 올리면 「1.1km」가 돼 버린다)
 */
export function formatDistance(meters: number): string {
    const rounded = Math.max(0, Math.round(meters / 10) * 10);
    if (rounded < 1000) return `${rounded}m`;
    return `${(Math.round(meters / 100) / 10).toFixed(1)}km`;
}

/**
 * 「가까이에 없다」고 본 거리(m) → 「2km」 · 「1.5km」 · 「800m」 — 「2km 안에 판정할 수 있는 역이 없어요」의 앞 글자 (결정.md 6절, v39 화면 10).
 * formatDistance와 같은 규칙이고, 딱 떨어지는 km만 소수 없이 쓴다 (그림의 「2km」) — 잰 거리가 아니라 정해 둔 기준 값이라서
 */
export function formatDistanceLimit(meters: number): string {
    return formatDistance(meters).replace(".0km", "km");
}

/**
 * 배지에 숫자 대신 「우이」를 쓰는 하나뿐인 노선. 노선색(#B0CE18)이 밝아서 글자색도 이 노선만 짙다 (결정.md 1절).
 * 배지를 그리는 곳(역명판 · 역 찾기 목록 줄)이 글자 모양을 바꿀 때 이 이름과 견준다
 */
export const UI_LINE = "우이신설선";

/**
 * 호선 배지에 쓸 글자 (결정.md 1절): 「7호선」 → 「7」, 우이신설선만 「우이」.
 * 그 밖의 이름(아직 없는 노선)은 정해진 모양이 없어서 빈 글자다 → 글자 없이 노선색 원만 그려진다.
 * 역명판 배지(24px)와 역 찾기 목록 배지(26px)가 같이 쓴다 (U2 때는 역명판 파일 안에 있었다)
 */
export function lineBadgeText(lineName: string): string {
    if (lineName === UI_LINE) return "우이";
    return /^(\d+)호선$/.exec(lineName)?.[1] ?? "";
}
