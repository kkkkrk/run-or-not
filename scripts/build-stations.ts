/**
 * 원본 역 데이터 → src/data/stations.json
 *
 * 실행 (레포 루트에서): npx tsx scripts/build-stations.ts
 * 원본: scripts/raw/station-master.json — 서울 열린데이터광장 「서울시 역사마스터 정보」
 *       출처 URL·받은 날짜는 scripts/raw/README.md
 *
 * 하는 일
 *   1. 원본의 route(법정 노선명)를 실제 운행 호선으로 바꾼다 (경부선 → 1호선 등)
 *   2. 한 행이 여러 호선인 역은 호선마다 Station을 만든다 (ROW_OVERRIDES)
 *   3. 표시명과 서울시 API 역명이 다른 (역, 호선)은 apiName을 바꾼다 (API_NAME_OVERRIDES)
 *   4. 같은 (표시명, 호선)이 두 번 나오면 id가 작은 쪽 하나만 남긴다
 *   5. 판정할 수 없는 역을 뺀다
 *      - 노선 단위: 남은 시간(barvlDt)을 주지 않는 노선 (EXCLUDED_LINES)
 *      - 역 단위: 실시간 API가 데이터를 주지 않는 역 (EXCLUDED_STATIONS)
 *   6. id 순으로 정렬해 쓴다 → 다시 돌려도 결과가 같다
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Station } from "../src/types/subway"; // 별칭(@/) 말고 상대 경로

const RAW_PATH = path.join(process.cwd(), "scripts/raw/station-master.json");
const OUT_PATH = path.join(process.cwd(), "src/data/stations.json");

// ── 원본 모양 ────────────────────────────────────────────────
type RawRow = {
    bldn_id: string; // 역사 ID. 앞자리 0이 있으니 숫자로 바꾸지 않는다 ("0150")
    route: string; //   법정 노선명 (호선이 아님: 경부선, 일산선 …)
    bldn_nm: string; // 역사명 "공릉(서울과학기술대)"
    lat: string; //     위도
    lot: string; //     경도
};
type RawFile = { DESCRIPTION: Record<string, string>; DATA: RawRow[] };

// ── 호선 → 서울시 API subwayId ───────────────────────────────
// 1~9호선은 확실. 나머지는 3-1에서 실제 응답의 subwayId로 확인할 것
const LINES = {
    "1호선": "1001",
    "2호선": "1002",
    "3호선": "1003",
    "4호선": "1004",
    "5호선": "1005",
    "6호선": "1006",
    "7호선": "1007",
    "8호선": "1008",
    "9호선": "1009",
    경의중앙선: "1063", // 확인
    공항철도: "1065", //   확인
    경춘선: "1067", //     확인
    수인분당선: "1075", // 확인
    신분당선: "1077", //   확인
    경강선: "1081", //     확인
    우이신설선: "1092", // 확인
    서해선: "1093", //     확인
    신림선: "1094", //     확인
    "GTX-A": "1032", //    확인
} as const satisfies Record<string, string>;
type LineName = keyof typeof LINES;

// 예외 표의 키: "표시명|호선"
// 표시명은 toDisplayName을 거친 값이다: 원본 "총신대입구(이수)" → "총신대입구"
type StationKey = `${string}|${LineName}`;

// ── 원본 route → 호선 (기본 규칙) ─────────────────────────────
// 여기 없는 route는 버린다: 인천1호선, 인천2호선, 의정부선, 에버라인선, 김포골드라인
// (서울시 실시간 API 미제공으로 보임 — 3-1에서 확인하고, 제공되면 LINES와 여기에 추가)
const ROUTE_TO_LINE: Partial<Record<string, LineName>> = {
    "1호선": "1호선",
    경부선: "1호선",
    경인선: "1호선",
    경원선: "1호선", // 1008~1014는 경의중앙선 → ROW_OVERRIDES
    장항선: "1호선",
    "2호선": "2호선",
    "3호선": "3호선",
    일산선: "3호선",
    "4호선": "4호선",
    안산선: "4호선",
    과천선: "4호선",
    진접선: "4호선",
    "5호선": "5호선",
    "6호선": "6호선",
    "7호선": "7호선",
    "7호선(인천)": "7호선", // "7호선" 행과 중복 → dedupe에서 걸러짐
    "8호선": "8호선",
    별내선: "8호선",
    "9호선": "9호선",
    "9호선(연장)": "9호선",
    경의중앙선: "경의중앙선",
    중앙선: "경의중앙선",
    경춘선: "경춘선",
    분당선: "수인분당선",
    수인선: "수인분당선",
    신분당선: "신분당선",
    "신분당선(연장)": "신분당선",
    "신분당선(연장2)": "신분당선",
    공항철도1호선: "공항철도",
    경강선: "경강선",
    우이신설선: "우이신설선",
    서해선: "서해선",
    신림선: "신림선",
    "수도권 광역급행철도": "GTX-A",
};

// ── 행 단위 예외: route 규칙 대신 이 호선들로 만든다 ───────────
// 원본에 없는 호선(한 행 = 여러 호선, 누락된 행)도 여기서 보충한다
const ROW_OVERRIDES: Partial<Record<string, readonly LineName[]>> = {
    "1003": ["1호선", "경의중앙선"], //      용산
    "1008": ["경의중앙선"], //                이촌 (route=경원선이지만 1호선 아님)
    "1009": ["경의중앙선"], //                서빙고
    "1010": ["경의중앙선"], //                한남
    "1011": ["경의중앙선"], //                옥수
    "1012": ["경의중앙선"], //                응봉
    "1013": ["경의중앙선", "수인분당선"], // 왕십리 (2·5호선은 별도 행)
    "1014": ["경의중앙선", "수인분당선"], // 청량리 (1호선은 0158 행)
    "1015": ["1호선", "경의중앙선"], //      회기
    "1953": ["3호선", "경의중앙선"], //      대곡 (원본에 경의중앙선 대곡 행이 없음)
    "2519": ["2호선", "5호선"], //           까치산 (원본엔 5호선 행만 있음 → 2호선 신정지선 종점이 빠져 2호선이 50개였음)
};

// ── API 역명 예외: "표시명|호선" → 서울시 실시간 API 역명 ────────────
// 역별 조회는 역명이 정확히 같아야 한다 (괄호를 떼고 "군자"로 조회하면 INFO-200, "군자(능동)"은 INFO-000)
// 근거: 2026-10-31 realtimeStationArrival/ALL 응답의 statnNm과 대조 (남기는 8개 노선, 역 수 일치 확인)
// 같은 표시명이라도 호선마다 다를 수 있어 호선까지 키로 쓴다 (5호선 올림픽공원(한국체대) ↔ 9호선 올림픽공원)
// 노선째 뺀 호선(8호선·수인분당선 등)은 없다. 되살릴 때 ALL로 다시 대조한다
//   (예전 표에 있던 남한산성입구·몽촌토성(8호선), 대모산입구(수인분당선)는 그때 다시 확인)
const API_NAME_OVERRIDES: Partial<Record<StationKey, string>> = {
    // 4호선 ("서울역"으로 조회하면 GTX-A만 나온다)
    "서울역|4호선": "서울",
    // 5호선
    "광나루|5호선": "광나루(장신대)",
    "군자|5호선": "군자(능동)",
    "굽은다리|5호선": "굽은다리(강동구민회관앞)",
    "신정|5호선": "신정(은행정)",
    "아차산|5호선": "아차산(어린이대공원후문)",
    "오목교|5호선": "오목교(목동운동장앞)",
    "올림픽공원|5호선": "올림픽공원(한국체대)",
    "천호|5호선": "천호(풍납토성)",
    // 6호선
    "대흥|6호선": "대흥(서강대앞)",
    "상월곡|6호선": "상월곡(한국과학기술연구원)",
    "새절|6호선": "새절(신사)",
    "안암|6호선": "안암(고대병원앞)",
    "월곡|6호선": "월곡(동덕여대)",
    "월드컵경기장|6호선": "월드컵경기장(성산)",
    "응암|6호선": "응암순환(상선)",
    "증산|6호선": "증산(명지대앞)",
    "화랑대|6호선": "화랑대(서울여대입구)",
    // 7호선
    "공릉|7호선": "공릉(서울산업대입구)",
    "군자|7호선": "군자(능동)",
    "상도|7호선": "상도(중앙대앞)",
    "숭실대입구|7호선": "숭실대입구(살피재)",
    "어린이대공원|7호선": "어린이대공원(세종대)",
    "이수|7호선": "총신대입구(이수)", // 표시명 확인 필요 — 경고가 뜨면 "총신대입구|7호선"
    // 우이신설선 (API는 띄어 쓴다)
    "4.19민주묘지|우이신설선": "4.19 민주묘지", // 표시명 확인 필요
};

// ── 남은 시간(barvlDt)을 주지 않는 노선: 노선째 뺀다 (컨텍스트 7절) ──
// 근거: 2026-10-29 실측 847회, 경강선은 2026-10-30 실측 (scripts/raw/README.md 「제외 근거」)
//   위 노선은 아직 안 온 열차의 barvlDt가 늘 0이었다 (경강선 12개 역 5,239행 중 0%)
//   1호선: 서울교통공사 구간인 종로3가에서도 남은 시간이 있는 열차가 38%뿐 (나머지는 코레일 구간에서 온 열차)
//          → 일부 역만 남기면 먼저 오는 열차를 판정이 건너뛴다 → 통째로 뺀다
// LINES·ROUTE_TO_LINE에는 남겨 둔다: MVP 이후 시간표 + 위치로 되살릴 때 subwayId가 필요
const EXCLUDED_LINES: readonly LineName[] = [
    "1호선", "8호선", "경의중앙선", "수인분당선", "신분당선",
    "경춘선", "공항철도", "서해선", "신림선", "GTX-A", "경강선",
];

// ── 남는 노선 중 판정할 수 없는 역: 역 단위로 뺀다 (컨텍스트 7절) ──
// 근거: 2026-10-30 실측 (scripts/raw/README.md 「제외 근거」)
// 키에 호선까지 쓰는 이유: 같은 이름의 다른 역(5호선 양평 ↔ 경의중앙선 양평)을 같이 지우지 않으려고
// (예전 광명·서동탄·춘천은 노선째 빠지므로 지웠다. 노선을 되살릴 때 다시 조사한다)
const EXCLUDED_STATIONS: readonly StationKey[] = [
    // 3호선 일산선 (barvlDt 0. 지축 상행만 값이 있으나 ±30초 적중 0%)
    "지축|3호선", "삼송|3호선", "원흥|3호선", "원당|3호선", "화정|3호선", "대곡|3호선",
    "백석|3호선", "마두|3호선", "정발산|3호선", "주엽|3호선", "대화|3호선",
    // 4호선 과천선 · 안산선 (barvlDt 0)
    "선바위|4호선", "경마공원|4호선", "대공원|4호선", "과천|4호선", "정부과천청사|4호선",
    "인덕원|4호선", "평촌|4호선", "범계|4호선", "금정|4호선",
    "산본|4호선", "수리산|4호선", "대야미|4호선", "반월|4호선", "상록수|4호선", "한대앞|4호선",
    "중앙|4호선", "고잔|4호선", "초지|4호선", "안산|4호선", "신길온천|4호선", "정왕|4호선", "오이도|4호선",
    // 4호선 진접선 (데이터 없음, INFO-200)
    "별내별가람|4호선", "오남|4호선", "진접|4호선",
    // 5호선 하남선 + 강일 (barvlDt 0. 강일은 서울 강동구지만 하남선 시설)
    "강일|5호선", "미사|5호선", "하남풍산|5호선", "하남시청|5호선", "하남검단산|5호선",
    // 7호선 의정부 (10-30 데이터 없음, INFO-200 — 10-31 ALL에는 barvlDt와 함께 나옴. 재확인 대상)
    // 광명·부천·인천 13개 역은 barvlDt 100%라 남긴다
    "장암|7호선",
    // 서울 경계 역: 가장 가까운 열차가 서울 밖 구간에 있으면 barvlDt 0 → 판정이 첫 열차를 건너뜀
    // (남태령 상행 100%, 사당 상행 73%, 구파발 하행 56%, 이수 상행 37%). 1호선을 뺀 이유와 같다
    // 같은 역의 다른 호선(사당 2호선, 이수 7호선)은 남는다
    "구파발|3호선", "남태령|4호선", "사당|4호선", "총신대입구|4호선",
];

// 한국 대략 범위. 위도·경도를 바꿔 넣은 행이나 빈 값을 잡는다
const LAT_RANGE = [33, 39] as const;
const LNG_RANGE = [124, 132] as const;

// ── 변환 ─────────────────────────────────────────────────────

/** 끝의 괄호 부분만 뗀다: "공릉(서울과학기술대)" → "공릉" */
function toDisplayName(bldnNm: string): string {
    const name = bldnNm.replace(/\s*\([^()]*\)\s*$/, "").trim();
    return name || bldnNm.trim();
}

function parseCoord(value: string, [min, max]: readonly [number, number]): number | null {
    if (value.trim() === "") return null; // Number("")는 0이라 따로 막는다
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function linesOf(row: RawRow): readonly LineName[] {
    const override = ROW_OVERRIDES[row.bldn_id];
    if (override) return override;
    const line = ROUTE_TO_LINE[row.route];
    return line ? [line] : [];
}

/** 행 하나 → Station 0개 이상 (지원 안 하는 노선이면 0개, 여러 호선이면 여러 개) */
function toStations(row: RawRow): Station[] {
    const lines = linesOf(row);
    if (lines.length === 0) return [];

    const lat = parseCoord(row.lat, LAT_RANGE);
    const lng = parseCoord(row.lot, LNG_RANGE);
    if (lat === null || lng === null) {
        console.warn(`  ! 좌표 이상으로 건너뜀: ${row.bldn_id} ${row.bldn_nm} (lat=${row.lat}, lot=${row.lot})`);
        return [];
    }

    const name = toDisplayName(row.bldn_nm);
    return lines.map((lineName) => {
        const subwayId = LINES[lineName];
        const key: StationKey = `${name}|${lineName}`;
        return {
            id: `${row.bldn_id}-${subwayId}`, // 한 행이 여러 호선이 돼도 항상 고유
            name,
            apiName: API_NAME_OVERRIDES[key] ?? name,
            subwayId,
            lineName,
            lat,
            lng,
        };
    });
}

// id는 ASCII뿐이라 localeCompare 대신 단순 비교 (실행 환경 로케일과 무관하게 같은 순서)
const byId = (a: Station, b: Station): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const keyOf = (s: Station): string => `${s.name}|${s.lineName}`;

type Dropped = { station: Station; keptId: string };

/** 같은 (표시명, 호선)은 id가 작은 쪽만 남긴다. 결과는 id 순 */
function dedupe(stations: Station[]): { kept: Station[]; dropped: Dropped[] } {
    const keptByKey = new Map<string, Station>();
    const dropped: Dropped[] = [];
    for (const s of [...stations].sort(byId)) {
        const key = `${s.name}|${s.subwayId}`;
        const existing = keptByKey.get(key);
        if (existing) dropped.push({ station: s, keptId: existing.id });
        else keptByKey.set(key, s);
    }
    return { kept: [...keptByKey.values()], dropped }; // Map은 넣은 순서 유지 → 이미 정렬됨
}

// 왜 빠졌는지. 노선 표를 먼저 본다
type Excluded = { station: Station; reason: "line" | "station" };

/**
 * 노선 단위(EXCLUDED_LINES)와 역 단위(EXCLUDED_STATIONS)를 같이 본다. 순서는 유지
 * unmatchedKeys: 역 하나도 빼지 못한 EXCLUDED_STATIONS 키
 *   - 오타 ("총신대입구(이수)|4호선"처럼 괄호를 붙인 이름 포함)
 *   - 노선째 빠진 호선의 키 (노선 표가 먼저라 역 표까지 오지 않음 → 쓸모없는 줄)
 */
function excludeUnsupported(stations: Station[]): {
    kept: Station[];
    excluded: Excluded[];
    unmatchedKeys: StationKey[];
} {
    const lines = new Set<string>(EXCLUDED_LINES); // Station.lineName이 string이라 Set<string>으로
    const keys = new Set<string>(EXCLUDED_STATIONS);
    const usedKeys = new Set<string>();
    const kept: Station[] = [];
    const excluded: Excluded[] = [];
    for (const s of stations) {
        const key = keyOf(s);
        if (lines.has(s.lineName)) {
            excluded.push({ station: s, reason: "line" });
        } else if (keys.has(key)) {
            excluded.push({ station: s, reason: "station" });
            usedKeys.add(key);
        } else {
            kept.push(s);
        }
    }
    const unmatchedKeys = EXCLUDED_STATIONS.filter((k) => !usedKeys.has(k));
    return { kept, excluded, unmatchedKeys };
}

// ── 실행 ─────────────────────────────────────────────────────

function main(): void {
    const raw = JSON.parse(readFileSync(RAW_PATH, "utf-8")) as RawFile;
    if (!Array.isArray(raw.DATA)) throw new Error(`DATA 배열이 없습니다: ${RAW_PATH}`);
    const rows = raw.DATA;

    const converted = rows.flatMap(toStations);
    const { kept: unique, dropped } = dedupe(converted);
    const { kept, excluded, unmatchedKeys } = excludeUnsupported(unique);
    const byLine = excluded.filter((e) => e.reason === "line").map((e) => e.station);
    const byStation = excluded.filter((e) => e.reason === "station").map((e) => e.station);

    mkdirSync(path.dirname(OUT_PATH), { recursive: true }); //recursive:true 폴더가 이미 있으면 에러 없이 넘김
    writeFileSync(OUT_PATH, JSON.stringify(kept, null, 2) + "\n"); // 파일이 없으면 만들고 있으면 통째로 바꿈

    // ── 확인용 출력 ──
    console.log(
        `원본 ${rows.length}행 → 변환 ${converted.length}개 → 중복 제거 ${dropped.length}개` +
            ` → 노선 제외 ${byLine.length}개 → 역 제외 ${byStation.length}개 → 결과 ${kept.length}개`,
    );
    console.log(`저장: ${path.relative(process.cwd(), OUT_PATH)}`);

    const skippedRoutes = new Map<string, number>();
    for (const row of rows) {
        if (linesOf(row).length === 0) skippedRoutes.set(row.route, (skippedRoutes.get(row.route) ?? 0) + 1);
    }
    if (skippedRoutes.size > 0) {
        console.log("\n제외한 노선 (ROUTE_TO_LINE에 없음)");
        for (const [route, n] of skippedRoutes) console.log(`  ${route}: ${n}행`);
    }

    if (dropped.length > 0) {
        console.log("\n중복 제거");
        for (const { station: s, keptId } of dropped) {
            console.log(`  ${s.lineName} ${s.name}: ${s.id} 버림 (${keptId} 남김)`);
        }
    }

    if (byLine.length > 0) {
        console.log("\n남은 시간을 주지 않아 노선째 제외 (EXCLUDED_LINES)");
        for (const line of EXCLUDED_LINES) {
            const n = byLine.filter((s) => s.lineName === line).length;
            console.log(`  ${line}\t${n}개`);
        }
        console.log(`  합계\t${byLine.length}개`);
    }

    if (byStation.length > 0) {
        console.log("\n판정할 수 없어 역 단위 제외 (EXCLUDED_STATIONS)");
        for (const line of new Set(byStation.map((s) => s.lineName))) {
            const names = byStation.filter((s) => s.lineName === line).map((s) => s.name);
            console.log(`  ${line}\t${names.length}개: ${names.join(", ")}`);
        }
        console.log(`  합계\t${byStation.length}개`);
    }

    const renamed = kept.filter((s) => s.apiName !== s.name);
    if (renamed.length > 0) {
        console.log(`\nAPI 역명 예외 적용 (API_NAME_OVERRIDES) ${renamed.length}개`);
        for (const s of renamed) console.log(`  ${s.lineName} ${s.name} → ${s.apiName}`);
    }

    // ── 오타 잡기: 예외 표의 키가 실제 데이터와 하나도 안 맞으면 경고 ──
    const ids = new Set(rows.map((r) => r.bldn_id));
    const unusedRows = Object.keys(ROW_OVERRIDES).filter((id) => !ids.has(id));
    if (unusedRows.length > 0) console.warn(`\n! 원본에 없는 ROW_OVERRIDES id: ${unusedRows.join(", ")}`);

    // 남은 역(kept) 기준: 노선째 빠진 호선의 키도 쓸모없는 줄이라 같이 잡는다
    const keptKeys = new Set(kept.map(keyOf));
    const unusedNames = Object.keys(API_NAME_OVERRIDES).filter((k) => !keptKeys.has(k));
    if (unusedNames.length > 0) console.warn(`! 남은 역에 없는 API_NAME_OVERRIDES 키: ${unusedNames.join(", ")}`);

    if (unmatchedKeys.length > 0) {
        console.warn(`! 역을 하나도 못 뺀 EXCLUDED_STATIONS 키 (오타이거나 노선째 빠진 호선): ${unmatchedKeys.join(", ")}`);
    }

    const lineSet = new Set<string>(EXCLUDED_LINES);
    console.log("\n호선별 남은 역 수");
    for (const line of Object.keys(LINES) as LineName[]) {
        const count = kept.filter((s) => s.lineName === line).length;
        console.log(`  ${line}\t${lineSet.has(line) ? "- (노선 제외)" : count}`);
    }
}

main();