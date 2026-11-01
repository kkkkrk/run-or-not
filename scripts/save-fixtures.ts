/**
 * 서울시 실시간 도착 API 응답 → src/lib/__fixtures__/*.json (개발 가이드 3-1)
 *
 * 실행 (레포 루트에서, 열차가 다니는 06~23시에)
 *   npx tsx scripts/save-fixtures.ts                 전부 받기 (이미 있는 파일은 건너뜀)
 *   npx tsx scripts/save-fixtures.ts onsu-7 --force  하나만 다시 받기 (덮어씀)
 *
 * 왜 src/lib/api/seoul-subway.ts를 안 쓰나
 *   그 파일은 맨 위에 import "server-only"가 있어서 Next.js 서버 밖(tsx)에서 불러오면 바로 에러가 난다.
 *   그래서 URL 조립만 같은 모양으로 여기서 한 번 더 쓴다.
 *
 * 저장하는 것
 *   응답은 자르지 않고 통째로 (같은 순간은 다시 못 받는다)
 *   + 받은 시각 (거르기 테스트의 now로 쓴다)
 *   URL에는 키 대신 {KEY}를 적고, 저장 전에 키가 파일에 섞이지 않았는지 검사한다
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "http://swopenapi.seoul.go.kr/api/subway";
const OUT_DIR = path.join(process.cwd(), "src/lib/__fixtures__");

// ── 받을 역 ───────────────────────────────────────────────────
// 역명으로 조회하면 그 역의 모든 호선이 한 번에 온다 (온수 → 1호선 + 7호선)
type Target = { file: string; apiName: string; why: string };

const TARGETS: readonly Target[] = [
    { file: "seongsu-2", apiName: "성수", why: "2호선 · 성수행(순환 표기)은 성수에서도 남겨야 함" },
    { file: "onsu-7", apiName: "온수", why: "7호선 · 하행 온수행 = 이 역 종착 열차" },
    { file: "bonghwasan-6", apiName: "봉화산", why: "6호선 · 하행 봉화산행 = 이 역 종착 열차" },
    { file: "sungshin-ui", apiName: "성신여대입구", why: "우이신설선 · barvlDt가 1초 단위 카운트다운" },
    { file: "kkachisan", apiName: "까치산", why: "2호선(1002) 행이 오는지 확인 → ROW_OVERRIDES 2519" },
    { file: "info-200-gongneung", apiName: "공릉", why: "INFO-200 · 역명 불일치 (정식 역명은 공릉(서울산업대입구))" },
];

// ── 저장 파일 모양 ─────────────────────────────────────────────
export type Fixture = {
    fetchedAt: string; //   "2026-11-01T14:41:05+09:00" — 사람이 읽는 용도
    fetchedAtMs: number; // 1793511665000 — 테스트에 넘길 now
    apiName: string;
    url: string; //         키 자리는 {KEY}
    why: string;
    httpStatus: number;
    response: unknown; //   서울시 응답 통째 (손대지 않음)
};

// ms → "YYYY-MM-DDTHH:mm:ss+09:00" (컴퓨터 시간대와 상관없이 한국 시간)
function toKstIso(ms: number): string {
    return new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 19) + "+09:00";
}

// 응답 요약에 쓰는 최소한의 모양 (저장은 원본 그대로)
type Row = { subwayId?: string; btrainNo?: string; updnLine?: string; statnId?: string; bstatnId?: string; bstatnNm?: string; barvlDt?: string };
type Body = { errorMessage?: { code?: string }; code?: string; realtimeArrivalList?: Row[] };

function summarize(body: Body): string[] {
    const code = body.errorMessage?.code ?? body.code ?? "?"; // 정상은 errorMessage 안, INFO-200은 맨 위에 code
    const rows = body.realtimeArrivalList ?? [];
    const lines = [`코드 ${code} · ${rows.length}행`];

    const bySubway = new Map<string, Row[]>();
    for (const r of rows) {
        const id = r.subwayId ?? "?";
        bySubway.set(id, [...(bySubway.get(id) ?? []), r]);
    }
    for (const [id, rs] of bySubway) {
        const terminating = rs.filter((r) => r.bstatnId && r.bstatnId === r.statnId);
        const zero = rs.filter((r) => !r.barvlDt || r.barvlDt === "0");
        const dests = [...new Set(rs.map((r) => `${r.updnLine} ${r.bstatnNm}행`))].join(", ");
        lines.push(`  ${id}: ${rs.length}행 · 이 역 종착 ${terminating.length} · barvlDt 0 ${zero.length} · ${dests}`);
    }
    // 2026-10-30에 본 7호선 유령 열차 번호대 (7058~7173). 있으면 기록만 해 둔다 (컨텍스트 12절)
    const ghost = rows.filter((r) => r.subwayId === "1007" && /^70[5-9]\d$|^71[0-7]\d$/.test(r.btrainNo ?? ""));
    if (ghost.length) lines.push(`  ! 7호선 70xx~71xx번 ${ghost.length}대: ${ghost.map((r) => r.btrainNo).join(", ")} (유령 열차 의심)`);
    return lines;
}

async function saveOne(t: Target, key: string, force: boolean): Promise<void> {
    const outPath = path.join(OUT_DIR, `${t.file}.json`);
    if (existsSync(outPath) && !force) {
        console.log(`- ${t.file}: 이미 있음 → 건너뜀 (다시 받으려면 ${t.file} --force)`);
        return;
    }

    const urlPath = `/json/realtimeStationArrival/0/30/${encodeURIComponent(t.apiName)}`;
    const res = await fetch(`${BASE}/${key}${urlPath}`, { cache: "no-store" });
    const fetchedAtMs = Date.now(); // route가 응답을 받은 뒤 Date.now()를 넘기는 것과 같은 시점
    const text = await res.text();

    let response: unknown;
    try {
        response = JSON.parse(text);
    } catch {
        throw new Error(`${t.file}: JSON이 아님 (HTTP ${res.status}) → ${text.slice(0, 200)}`);
    }

    const fixture: Fixture = {
        fetchedAt: toKstIso(fetchedAtMs),
        fetchedAtMs,
        apiName: t.apiName,
        url: `${BASE}/{KEY}${urlPath}`,
        why: t.why,
        httpStatus: res.status,
        response,
    };
    const json = JSON.stringify(fixture, null, 2) + "\n";
    if (json.includes(key)) throw new Error(`${t.file}: 파일에 키가 들어 있음 → 저장 안 함`);

    writeFileSync(outPath, json);
    console.log(`✓ ${t.file} (${fixture.fetchedAt})`);
    for (const line of summarize(response as Body)) console.log(`  ${line}`);

    if (t.file === "kkachisan") {
        const has2 = ((response as Body).realtimeArrivalList ?? []).some((r) => r.subwayId === "1002");
        console.log(
            has2
                ? "  → 까치산 2호선(1002) 있음: ROW_OVERRIDES 2519 줄은 그대로 둔다"
                : "  → 까치산 2호선(1002) 없음: 다른 시간에 한 번 더 보고, 그래도 없으면 ROW_OVERRIDES 2519 줄을 지운다",
        );
    }
}

async function main(): Promise<void> {
    try {
        process.loadEnvFile(".env.local"); // Node 20.12+ (Next.js가 아니라 .env.local을 자동으로 안 읽는다)
    } catch {
        // 파일이 없으면 이미 환경 변수로 넣었다고 보고 아래에서 검사
    }
    const key = process.env.SEOUL_API_KEY;
    if (!key) throw new Error("SEOUL_API_KEY가 없습니다 (.env.local 확인)");

    const args = process.argv.slice(2);
    const force = args.includes("--force");
    const only = args.filter((a) => !a.startsWith("--"));
    const targets = only.length ? TARGETS.filter((t) => only.includes(t.file)) : TARGETS;
    if (only.length && targets.length !== only.length) {
        throw new Error(`모르는 파일 이름: ${only.join(", ")} (가능: ${TARGETS.map((t) => t.file).join(", ")})`);
    }

    mkdirSync(OUT_DIR, { recursive: true });
    for (const t of targets) {
        await saveOne(t, key, force); // 한 번에 하나씩 (6회 = 일일 한도 1,000회 중 6회)
    }
}

main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});