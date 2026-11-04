// src/lib/arrivals.ts
// 서울시 원본 응답 → 관측값(ArrivalObservation) → 고정된 도착 시각(Arrival)
// 서버(/api/arrivals: 변환·거르기)와 브라우저(use-arrivals: 고정)에서 둘 다 import한다
// → 'server-only'를 붙이지 않는다. React·스토어·브라우저 API를 import하지 않는다. 「지금 시각」은 인자로 받는다
import type { Arrival, ArrivalObservation, Direction } from "@/types/subway";

// ── 원본 모양 ─────────────────────────────────────────────────
// 서울시 원본 응답의 열차 하나. 실제 응답에서 "쓰는 필드만" 정의한다.
// 이 타입은 export하지 않는다. 서울시가 필드를 바꿔도 고칠 곳이 이 파일 하나다.
// 예시 값은 src/lib/__fixtures__/ (2026-11-01 15:24 실측)
type RawArrival = {
    subwayId: string;    // 몇 호선인지 호선 코드 예: "1002"
    updnLine: string;    // 열차 진행 방향 예: 2호선 "내선"/"외선", 나머지 "상행"/"하행"
    trainLineNm: string; // 행선지 - 다음 방면 예: "성수행 - 뚝섬방면"
    statnId: string;     // 조회한 역 id 예: "1007000750" (온수 7호선)
    bstatnId: string;    // 행선지(종착) 역 id. statnId와 같으면 이 역에서 끝나는 열차 예: "1007000750"
    bstatnNm: string;    // 행선지 역 이름 예: "온수", "응암순환(상선)"
    /** 열차 키로 사용 (+ 방향) */
    btrainNo: string;    // 열차 번호 예: "7155"
    barvlDt: string;     // recptnDt 기준 도착까지 남은 초 예: "360". "0"은 남은 시간을 모른다는 뜻 (도착·진입 중이거나 미지원 노선)
    recptnDt: string;    // 이 도착 정보를 생성한 시각. 시간대 표기 없음, 한국 시간 예: "2026-11-01 15:23:41"
    arvlMsg2: string;    // 도착 안내 문구 예: "6분 후 (광명사거리)"
    arvlMsg3: string;    // 열차의 현재 위치 역 이름 예: "광명사거리"
    arvlCd: string;      // 도착 코드 0 진입 · 1 도착 · 2 출발 · 3 전역 출발 · 4 전역 진입 · 5 전역 도착 · 99 운행 중

    // 지금은 안 쓰지만 응답에 있는 필드 (픽스처에 통째로 남아 있음)
    // btrainSttus: string; // 열차 종류 예: 일반/급행/ITX
    // lstcarAt: string;    // 막차 여부 0/1
};

// 응답 결과 코드. 정상 응답은 errorMessage 안에, INFO-200(데이터 없음)은 맨 위에 온다 (HTTP는 둘 다 200)
type RawResult = {
    status: number;  // 정상 200, INFO-200은 500
    code: string;    // "INFO-000" 정상 · "INFO-200" 해당 데이터 없음(새벽, 역명 불일치) · 그 밖은 오류
    message: string; // 예: "해당하는 데이터가 없습니다."
};
type RawArrivalSuccess = { errorMessage: RawResult; realtimeArrivalList: RawArrival[] };
type RawArrivalFailure = RawResult;

/**
 * fetchRealtimeArrivals의 응답(unknown)에서 결과 코드와 열차 목록을 꺼낸다.
 * 어느 쪽에 코드가 있는지(errorMessage 안 / 맨 위)는 이 파일만 안다.
 * 모양을 알 수 없으면 code "UNKNOWN", list [] — route에서 502로 처리하면 된다.
 */
export function readArrivalResponse(body: unknown): { code: string; message: string; list: RawArrival[] } {
    if (typeof body !== "object" || body === null) {
        return { code: "UNKNOWN", message: "응답이 객체가 아님", list: [] };
    }
    const res = body as Partial<RawArrivalSuccess & RawArrivalFailure>;
    const result: Partial<RawResult> = res.errorMessage ?? res; // 정상: errorMessage 안 / INFO-200: 맨 위
    const code = typeof result.code === "string" ? result.code : "UNKNOWN";
    const message = typeof result.message === "string" ? result.message : "";
    const list = Array.isArray(res.realtimeArrivalList) ? res.realtimeArrivalList : [];
    return { code, message, list };
}

// ── 3-4 원본 → 관측값 변환, 거르기 ──────────────────────────────

export const STALE_MS = 3 * 60_000; // 이보다 묵은 행은 버림 (now − 생성 시각 > 3분). 10-29 실측 기준
export const FUTURE_MS = 60_000;    // 이보다 미래인 생성 시각은 버림 (생성 시각 − now > 1분). 신분당선 사례

// 행선지가 이 역이어도 계속 가는 경우 (순환 표기) — 2026-10-30 실측
// 이 표에 있으면 bstatnId === statnId여도 「이 역 종착」으로 보지 않는다
const LOOP_DESTINATIONS: ReadonlyArray<{ subwayId: string; bstatnNm: string }> = [
    { subwayId: "1002", bstatnNm: "성수" },           // 2호선 순환 열차. 내선·외선 모두 「성수행」인데 성수를 지나 계속 감 (seongsu-2 픽스처)
    { subwayId: "1006", bstatnNm: "응암순환(상선)" }, // 6호선 응암 순환 구간 (응암에서 직접 확인은 아직)
];

/**
 * "2026-11-01 15:23:41" 같은 문자열을 한국 시간(+09:00)으로 해석해 ms로.
 * 실행하는 컴퓨터의 시간대와 상관없이 같은 값이 나와야 한다 (테스트는 TZ=UTC로 돈다)
 */
export function parseRecptnDt(recptnDt: string): number {
    // "2026-11-01 15:23:41" → "2026-11-01T15:23:41+09:00" (ISO 8601 형식 + 한국 시간대)
    return Date.parse(recptnDt.replace(" ", "T") + "+09:00");
}

export function toDirection(updnLine: string): Direction | null {
    if(updnLine === "상행" || updnLine === "내선") return "up";
    if(updnLine === "하행" || updnLine === "외선") return "down";
    return null;
}

/**
 * 이 역에서 끝나는 열차인가. 이름이 아니라 id로 판단한다: bstatnId === statnId
 * 단, LOOP_DESTINATIONS(순환 표기)에 있으면 계속 가는 열차라 false
 */
function isTerminatingHere(raw: RawArrival): boolean {
    for(const item of LOOP_DESTINATIONS){
        if(item.subwayId === raw.subwayId && item.bstatnNm === raw.bstatnNm) {
            return false;
        }
    }
    if(raw.bstatnId === raw.statnId) return true;
    return false;
}

/**
 * 열차 하나 변환. 못 쓰는 행이면 null:
 *   barvlDt가 0이거나 빈 값 / 방향을 모름 / now보다 STALE_MS 넘게 묵음 / now보다 FUTURE_MS 넘게 미래 / 이 역 종착
 * 필드 대응: trainNo ← btrainNo, destination ← bstatnNm, label ← trainLineNm, message ← arvlMsg2,
 *           observedAt ← parseRecptnDt(recptnDt), remainingSec ← Number(barvlDt)
 * '진입' 뒤 목록에서 사라지는 열차는 오류가 아니다. 여기선 할 일 없음 (고정 단계에서 그냥 빠짐)
 */
export function toObservation(raw: RawArrival, now: number): ArrivalObservation | null {
    if(!(Number(raw.barvlDt) > 0)) return null;

    const direction = toDirection(raw.updnLine);
    if(direction === null) return null;

    const observedAt = parseRecptnDt(raw.recptnDt);
    if(Number.isNaN(observedAt)) return null;
    if(now - observedAt > STALE_MS) return null;
    if(observedAt - now > FUTURE_MS) return null;

    if(isTerminatingHere(raw)) return null;

    return {
        trainNo: raw.btrainNo,
        subwayId: raw.subwayId,
        direction: direction,
        destination: raw.bstatnNm,
        label: raw.trainLineNm,
        message: raw.arvlMsg2,
        observedAt: observedAt,
        remainingSec: Number(raw.barvlDt)
    }
}

/** 전체 변환: 다른 호선 거르기 → toObservation → null 제거. now는 route가 Date.now()를 넘긴다 */
export function toObservations(raws: RawArrival[], subwayId: string, now: number): ArrivalObservation[] {
    return raws
    .filter(raw => raw.subwayId === subwayId)
    .map(raw => toObservation(raw, now))
    .filter((raw): raw is ArrivalObservation => raw !== null);
}

// ── 3-6 도착 시각 고정과 첫 관측 노선 보정 ─────────────────────────
// 5-3의 use-arrivals queryFn 안에서 부른다 (브라우저에서 실행). React를 모르는 순수 함수로 둔다

// 첫 관측 때만 쓰는 노선 보정 (초). 양수 = 기존 공식(observedAt + remainingSec)이 늦게 예측 → 그만큼 뺀다
// 표에 없는 노선은 0
// 2026-10-29(목) 15:36–16:13 하루 실측 후보값. 출근 시간에 한 번 더 재서 확정 (재측정 날짜·시간대를 여기에 적기)
// 참고: 10-30 17시대엔 2호선 +2, 9호선 +30으로 크게 달랐음
export const LINE_OFFSET_SEC: Readonly<Record<string, number>> = {
    "1002": -34, "1003": 43, "1004": 68, "1005": 24,
    "1006": 36, "1007": 26, "1009": 56, "1092": -14,
};

/** 열차 키 → { 마지막으로 본 남은 초, 고정한 도착 정보 } */
export type AnchorMap = Record<string, { remainingSec: number; arrival: Arrival }>;

/** 열차 키 = 열차 번호 + 방향 (같은 번호가 반대 방향에 있을 수 있음) */
export function trainKey(o: Pick<ArrivalObservation, "trainNo" | "direction">): string {
    return `${o.trainNo}:${o.direction}`;
}

/**
 * 이전 고정값 맵 + 새 관측값[] → 새 맵 + Arrival[] (arrivalAt 오름차순)
 *   처음 보는 열차: observedAt + remainingSec − LINE_OFFSET_SEC, basis "first-seen"
 *   이미 본 열차, remainingSec가 바뀜: 그 응답의 observedAt + remainingSec로 다시 고정, basis "changed"
 *   이미 본 열차, remainingSec가 그대로: 이전 arrival을 그대로 둠 (recptnDt만 바뀐 응답)
 *   새 응답에 없는 열차: 새 맵에 넣지 않음 (진입 후 사라짐 포함)
 * 우이신설선처럼 매번 값이 바뀌는 노선은 자동으로 「매 응답 기준」이 된다. 노선별로 분기하지 않는다
 * prev는 바꾸지 않는다 (새 객체를 돌려준다)
 */
export function anchorArrivals(prev: AnchorMap, obs: ArrivalObservation[]): { next: AnchorMap; arrivals: Arrival[] } {
    const next: AnchorMap = {}; // 새 응답에 있는 열차만 담는다 → 응답에 없는 열차는 저절로 빠진다

    for (const o of obs) {
        const key = trainKey(o);
        const before = prev[key]; 
        const { observedAt, remainingSec, ...rest } = o; // Arrival에는 이 두 필드가 없다

        let arrivalAt: number;
        let basis: Arrival["basis"];
        if (before && before.remainingSec === remainingSec) {
            // 남은 초 그대로 (recptnDt만 바뀐 응답) → 처음 고정한 시각 유지
            arrivalAt = before.arrival.arrivalAt;
            basis = before.arrival.basis;
        } else if (before) {
            // 남은 초가 바뀜 → 이 응답 기준으로 다시 고정
            arrivalAt = observedAt + remainingSec * 1000;
            basis = "changed";
        } else {
            // 처음 본 열차 → 노선 보정값을 뺀다 (표에 없는 노선은 0)
            const offsetSec = LINE_OFFSET_SEC[o.subwayId] ?? 0;
            arrivalAt = observedAt + (remainingSec - offsetSec) * 1000;
            basis = "first-seen";
        }

        // 안내 문구(message 등)는 최신 응답 것으로, 시각만 규칙대로
        next[key] = { remainingSec, arrival: { ...rest, arrivalAt, basis } };
    }

    const arrivals = Object.values(next)
        .map((entry) => entry.arrival)
        .sort((a, b) => a.arrivalAt - b.arrivalAt);
    return { next, arrivals };
}
