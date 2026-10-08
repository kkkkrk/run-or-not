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
 *   3. 표시명과 서울시 API 역명이 다른 역은 apiName을 바꾼다 (API_NAME_OVERRIDES)
 *   4. 같은 (표시명, 호선)이 두 번 나오면 id가 작은 쪽 하나만 남긴다
 *   5. 실시간 API가 데이터를 주지 않는 역을 뺀다 (EXCLUDED_STATIONS)
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
};

// ── API 역명 예외: 표시명 → 서울시 실시간 API 역명 ────────────
// 출처: 서울시 지하철 실시간 도착정보(OA-12764) 데이터셋 설명의 「역조회시 참조」 (2026-10-08 확인)
//       서울역 → 서울: 같은 페이지의 "샘플 키로는 '서울'역만 조회 가능" 안내
// 표시명 기준이라 같은 역이면 호선이 달라도 같은 값을 쓴다 (천호 5·8호선)
// 3단계에서 실제로 조회해 보며 늘어난다
const API_NAME_OVERRIDES: Partial<Record<string, string>> = {
    공릉: "공릉(서울산업대입구)",
    남한산성입구: "남한산성입구(성남법원, 검찰청)",
    대모산입구: "대모산",
    몽촌토성: "몽촌토성(평화의문)",
    서울역: "서울",
    응암: "응암순환(상선)",
    천호: "천호(풍납토성)",
};

// ── 실시간 API 미제공 역: 목록에서 뺀다 (컨텍스트 7절) ─────────
// 키는 "표시명|호선". 같은 이름의 다른 역(5호선 양평 ↔ 경의중앙선 양평)을 같이 지우지 않으려고 호선까지 쓴다
// 출처: OA-12764 「서울시 이외의 역구간은 미제공 (예, 광명, 서동탄, 춘천 등)」 — 지금은 예시로 든 역만.
//       나머지는 3단계에서 조회해 데이터가 안 오면 추가한다
type StationKey = `${string}|${LineName}`;
const EXCLUDED_STATIONS: readonly StationKey[] = [
    "광명|1호선",
    "서동탄|1호선",
    "춘천|경춘선",
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
        return {
            id: `${row.bldn_id}-${subwayId}`, // 한 행이 여러 호선이 돼도 항상 고유
            name,
            apiName: API_NAME_OVERRIDES[name] ?? name,
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

/** EXCLUDED_STATIONS에 있는 역을 뺀다. 순서는 유지 */
function excludeUnsupported(stations: Station[]): { kept: Station[]; excluded: Station[] } {
    const keys = new Set<string>(EXCLUDED_STATIONS);
    const kept: Station[] = [];
    const excluded: Station[] = [];
    for (const s of stations) (keys.has(keyOf(s)) ? excluded : kept).push(s);
    return { kept, excluded };
}

// ── 실행 ─────────────────────────────────────────────────────

function main(): void {
    const raw = JSON.parse(readFileSync(RAW_PATH, "utf-8")) as RawFile;
    if (!Array.isArray(raw.DATA)) throw new Error(`DATA 배열이 없습니다: ${RAW_PATH}`);
    const rows = raw.DATA;

    const converted = rows.flatMap(toStations);
    const { kept: unique, dropped } = dedupe(converted);
    const { kept, excluded } = excludeUnsupported(unique);

    mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(kept, null, 2) + "\n");

    // ── 확인용 출력 ──
    console.log(
    `원본 ${rows.length}행 → 변환 ${converted.length}개 → 중복 제거 ${dropped.length}개` +
        ` → 미제공 제외 ${excluded.length}개 → 결과 ${kept.length}개`,
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

    if (excluded.length > 0) {
        console.log("\n실시간 API 미제공으로 제외 (EXCLUDED_STATIONS)");
        for (const s of excluded) console.log(`  ${s.lineName} ${s.name} (${s.id})`);
    }

    const renamed = kept.filter((s) => s.apiName !== s.name);
    if (renamed.length > 0) {
        console.log("\nAPI 역명 예외 적용 (API_NAME_OVERRIDES)");
        for (const s of renamed) console.log(`  ${s.lineName} ${s.name} → ${s.apiName}`);
    }

    // ── 오타 잡기: 예외 표의 키가 실제 데이터와 하나도 안 맞으면 경고 ──
    const ids = new Set(rows.map((r) => r.bldn_id));
    const unusedRows = Object.keys(ROW_OVERRIDES).filter((id) => !ids.has(id));
    if (unusedRows.length > 0) console.warn(`\n! 원본에 없는 ROW_OVERRIDES id: ${unusedRows.join(", ")}`);

    const names = new Set(converted.map((s) => s.name));
    const unusedNames = Object.keys(API_NAME_OVERRIDES).filter((n) => !names.has(n));
    if (unusedNames.length > 0) console.warn(`! 데이터에 없는 API_NAME_OVERRIDES 표시명: ${unusedNames.join(", ")}`);

    const keys = new Set(unique.map(keyOf));
    const unusedKeys = EXCLUDED_STATIONS.filter((k) => !keys.has(k));
    if (unusedKeys.length > 0) console.warn(`! 데이터에 없는 EXCLUDED_STATIONS 키: ${unusedKeys.join(", ")}`);

    console.log("\n호선별 역 수");
    for (const line of Object.keys(LINES) as LineName[]) {
        const count = kept.filter((s) => s.lineName === line).length;
        console.log(`  ${line}\t${count}`);
    }
}

main();