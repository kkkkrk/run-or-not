/**
 * 출근 시간 노선 보정값 재측정 (개발 가이드 3-6) — 1단계: 수집
 *
 * 서울시 도착정보 전체(realtimeStationArrival/ALL)를 20초마다 받아 measure-data/<날짜>/에 저장한다.
 * 분석은 scripts/analyze-offsets.ts가 한다.
 *
 * 실행 (레포 루트에서, 평일 출근 시간에)
 *   caffeinate -i npx tsx scripts/collect-arrivals.ts              기본 50분
 *   caffeinate -i npx tsx scripts/collect-arrivals.ts --minutes 30
 *   (caffeinate -i: 맥이 잠들지 않게. 뚜껑은 열어 두기)
 *   Ctrl+C로 중간에 멈춰도 그때까지 받은 건 남는다. 같은 날 다시 실행하면 같은 폴더에 이어서 쌓인다
 *
 * 호출 수: 50분 ÷ 20초 = 150회 (하루 한도 1,000회)
 * 저장: 남긴 8개 노선 행만, 필요한 필드만, gzip. 50분에 약 5~10MB
 * 키는 화면·파일 어디에도 남기지 않는다
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const BASE = "http://swopenapi.seoul.go.kr/api/subway";
// 남긴 8개 노선 (stations.json과 같음): 2·3·4·5·6·7·9호선, 우이신설선
const KEEP_LINES = new Set(["1002", "1003", "1004", "1005", "1006", "1007", "1009", "1092"]);
// 분석에 쓰는 필드만 (값은 받은 그대로 문자열)
const FIELDS = ["subwayId", "statnId", "statnNm", "updnLine", "btrainNo", "bstatnId", "bstatnNm", "arvlCd", "barvlDt", "recptnDt"] as const;

export type SlimRow = Record<(typeof FIELDS)[number], string>;
export type Snapshot = {
    fetchedAt: string;   // "2026-11-02T08:01:20+09:00"
    fetchedAtMs: number;
    code: string;        // INFO-000 정상
    rowsAll: number;     // 전체 행 수 (거르기 전)
    rows: SlimRow[];
};

function arg(name: string, fallback: number): number {
    const i = process.argv.indexOf(`--${name}`);
    const v = i >= 0 ? Number(process.argv[i + 1]) : fallback;
    if (!Number.isFinite(v) || v <= 0) throw new Error(`--${name} 값이 이상함`);
    return v;
}

// ms → 한국 시간 부분 (컴퓨터 시간대와 상관없이)
function kstParts(ms: number) {
    const iso = new Date(ms + 9 * 3600_000).toISOString(); // "2026-11-02T08:01:20.123Z"
    return { date: iso.slice(0, 10), time: iso.slice(11, 19), iso: iso.slice(0, 19) + "+09:00" };
}

async function fetchAll(key: string): Promise<{ code: string; list: Record<string, unknown>[] }> {
    const res = await fetch(`${BASE}/${key}/json/realtimeStationArrival/ALL`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
        errorMessage?: { code?: string };
        code?: string;
        realtimeArrivalList?: Record<string, unknown>[];
    };
    return { code: body.errorMessage?.code ?? body.code ?? "UNKNOWN", list: body.realtimeArrivalList ?? [] };
}

async function main(): Promise<void> {
    try {
        process.loadEnvFile(".env.local");
    } catch {
        // 이미 환경 변수로 넣었다고 보고 아래에서 검사
    }
    const key = process.env.SEOUL_API_KEY;
    if (!key) throw new Error("SEOUL_API_KEY가 없습니다 (.env.local 확인)");

    const minutes = arg("minutes", 50);
    const intervalSec = arg("interval", 20);
    const total = Math.floor((minutes * 60) / intervalSec);
    if (total > 300) throw new Error(`${total}회는 너무 많음 (하루 한도 1,000회). --minutes를 줄이기`);

    const startMs = Date.now();
    const outDir = path.join(process.cwd(), "measure-data", kstParts(startMs).date);
    mkdirSync(outDir, { recursive: true });
    console.log(`수집 시작 ${kstParts(startMs).time} · ${minutes}분 · ${intervalSec}초 간격 · ${total}회 → ${path.relative(process.cwd(), outDir)}/`);

    let stop = false;
    process.on("SIGINT", () => {
        if (stop) process.exit(130);
        stop = true;
        console.log("\n멈춤 요청 — 지금 받는 것까지 저장하고 끝냅니다 (한 번 더 누르면 바로 종료)");
    });

    let ok = 0;
    let failed = 0;
    for (let n = 0; n < total && !stop; n++) {
        // 시작 시각 기준으로 맞춰서 기다린다 (응답이 느려도 간격이 밀리지 않게)
        const due = startMs + n * intervalSec * 1000;
        const wait = due - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (stop) break;

        const fetchedAtMs = Date.now();
        const t = kstParts(fetchedAtMs);
        try {
            const { code, list } = await fetchAll(key);
            const rows = list
                .filter((r) => KEEP_LINES.has(String(r.subwayId)))
                .map((r) => Object.fromEntries(FIELDS.map((f) => [f, String(r[f] ?? "")])) as SlimRow);
            const snap: Snapshot = { fetchedAt: t.iso, fetchedAtMs, code, rowsAll: list.length, rows };
            writeFileSync(path.join(outDir, `${t.time.replaceAll(":", "")}.json.gz`), gzipSync(JSON.stringify(snap)));
            ok++;
            const left = Math.round(((total - n - 1) * intervalSec) / 60);
            console.log(`#${String(n + 1).padStart(3)} ${t.time} ${code} 전체 ${list.length}행 · 저장 ${rows.length}행 · 남은 약 ${left}분`);
        } catch (e) {
            failed++;
            const msg = (e instanceof Error ? e.message : String(e)).replaceAll(key, "***");
            console.log(`#${String(n + 1).padStart(3)} ${t.time} 실패: ${msg}`);
        }
    }
    console.log(`끝 · 성공 ${ok}회 · 실패 ${failed}회 → 다음: npx tsx scripts/analyze-offsets.ts`);
}

main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
