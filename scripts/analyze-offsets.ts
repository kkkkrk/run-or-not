/**
 * 출근 시간 노선 보정값 재측정 (개발 가이드 3-6) — 2단계: 분석
 *
 * 실행 (레포 루트에서, collect-arrivals.ts가 끝난 뒤)
 *   npx tsx scripts/analyze-offsets.ts                         measure-data/의 가장 최근 날짜 폴더
 *   npx tsx scripts/analyze-offsets.ts measure-data/2026-11-02
 *
 * 화면에 표를 찍고, 같은 내용을 그 폴더의 report.md로도 저장한다.
 *
 * 정의 (10-29·10-30 실측과 같음)
 *   정답(실제 도착): 그 역 행이 처음 '도착'·'출발'(arvlCd 1·2)이 된 응답과 바로 앞 응답의 recptnDt 중간.
 *                   '진입'(0) 뒤 도착 없이 사라지면 첫 '진입' + 10초. 이 역 종착 열차는 뺀다.
 *   판단 구간: 실제 도착 4분 전~도착에 받은 응답 중 barvlDt > 0인 행. 오차 = 예측 − 정답 (+ = 늦게 예측 = 놓칠 위험)
 *   적중: |오차| ≤ 30초
 *   정상 상태: 앱이 계속 열려 있던 경우 (수집 처음부터 고정 규칙을 그대로 돌림)
 *   앱을 막 열었을 때: 도착 1~7분 전에 열고 첫 응답 2개
 *   고정 규칙은 앱과 같다: barvlDt 0·빈 값, 3분 넘게 묵은 행, 응답에서 빠진 열차는 맵에서 지워져 다음에 '처음 본 열차'가 된다
 *   보정값은 교차 검증: 열차 번호 ÷ 2의 홀짝으로 두 무리로 나눠 한쪽에서 배우고 다른 쪽에 적용한다
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { LINE_OFFSET_SEC } from "../src/lib/arrivals";
import type { Snapshot } from "./collect-arrivals";

const LINE_NAMES: Record<string, string> = {
    "1002": "2호선", "1003": "3호선", "1004": "4호선", "1005": "5호선",
    "1006": "6호선", "1007": "7호선", "1009": "9호선", "1092": "우이신설",
};
const LINES = Object.keys(LINE_NAMES);
const PENDING = new Set(["0", "3", "4", "5", "99"]); // 아직 안 온 상태
const TABLE_CDS = ["99", "5", "3", "4", "0"];         // 상태보정표 열 (0 진입은 참고)
const LOOPS = [
    { subwayId: "1002", bstatnNm: "성수" },
    { subwayId: "1006", bstatnNm: "응암순환(상선)" },
];
const MIN_N = 30;          // 이보다 표본이 적은 칸은 값으로 쓰지 않는다
const WINDOW_SEC = 240;    // 판단 구간: 도착 4분 전까지
const HIT_SEC = 30;
const STALE_SEC = 180;

// ── 읽기 ───────────────────────────────────────────────────

type Entry = {
    snap: number;        // 몇 번째 응답인지
    fetchedAtMs: number;
    recptn: number;      // ms
    barvl: number;       // 초
    cd: string;
    line: string;
    trainNo: string;
    terminating: boolean;
};
type Seq = { key: string; line: string; statnNm: string; trainNo: string; entries: Entry[]; actual?: number; arrivalIdx?: number };

const parseKst = (s: string) => Date.parse(s.replace(" ", "T") + "+09:00");

function pickDir(): string {
    const given = process.argv[2];
    if (given) return given;
    const root = path.join(process.cwd(), "measure-data");
    const days = readdirSync(root).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (!days.length) throw new Error("measure-data/에 날짜 폴더가 없음 — 먼저 collect-arrivals.ts");
    return path.join(root, days[days.length - 1]);
}

function load(dir: string): Snapshot[] {
    return readdirSync(dir)
        .filter((f) => f.endsWith(".json.gz"))
        .sort()
        .map((f) => JSON.parse(gunzipSync(readFileSync(path.join(dir, f))).toString("utf8")) as Snapshot)
        .filter((s) => s.code === "INFO-000")
        .sort((a, b) => a.fetchedAtMs - b.fetchedAtMs);
}

function buildSeqs(snaps: Snapshot[]): Seq[] {
    const map = new Map<string, Seq>();
    snaps.forEach((s, snap) => {
        for (const r of s.rows) {
            const key = `${r.statnId}|${r.btrainNo}|${r.updnLine}`;
            let seq = map.get(key);
            if (!seq) {
                seq = { key, line: r.subwayId, statnNm: r.statnNm, trainNo: r.btrainNo, entries: [] };
                map.set(key, seq);
            }
            const loop = LOOPS.some((l) => l.subwayId === r.subwayId && l.bstatnNm === r.bstatnNm);
            seq.entries.push({
                snap,
                fetchedAtMs: s.fetchedAtMs,
                recptn: parseKst(r.recptnDt),
                barvl: Number(r.barvlDt) || 0,
                cd: r.arvlCd,
                line: r.subwayId,
                trainNo: r.btrainNo,
                terminating: r.bstatnId === r.statnId && !loop,
            });
        }
    });
    const lastSnap = snaps.length - 1;
    const seqs = [...map.values()].filter((q) => !q.entries.some((e) => e.terminating));
    for (const q of seqs) {
        const es = q.entries;
        const i = es.findIndex((e, k) => (e.cd === "1" || e.cd === "2") && es.slice(0, k).some((p) => PENDING.has(p.cd)));
        if (i > 0) {
            if (es[i].snap - es[i - 1].snap <= 2) { // 바로 앞 응답이 있어야 시각을 좁힐 수 있다
                q.actual = (es[i].recptn + es[i - 1].recptn) / 2;
                q.arrivalIdx = i;
            }
            continue;
        }
        // 진입 뒤 도착 없이 사라짐
        const enter = es.findIndex((e) => e.cd === "0");
        const last = es[es.length - 1];
        if (enter > 0 && last.cd === "0" && last.snap < lastSnap && !es.some((e) => e.cd === "1" || e.cd === "2")) {
            q.actual = es[enter].recptn + 10_000;
            q.arrivalIdx = es.length; // 판단 구간은 끝까지
        }
    }
    return seqs.filter((q) => q.actual !== undefined);
}

// ── 고정 규칙 흉내 ───────────────────────────────────────────

type Offsets = {
    name: string;
    first: (line: string, cd: string) => number;   // 처음 본 열차에서 뺄 초
    changed: (line: string, cd: string) => number; // 값이 바뀌어 다시 고정할 때 뺄 초
    noAnchor?: boolean;                            // true면 고정 없이 매 응답 기준 (지금 공식 A)
};
type Sample = { line: string; cd: string; basis: "first" | "changed"; err: number; group: number };

const group = (trainNo: string) => Math.floor(parseInt(trainNo, 10) / 2) % 2;
const usable = (e: Entry) => e.barvl > 0 && !e.terminating && e.fetchedAtMs - e.recptn <= STALE_SEC * 1000;

// entries[from..]를 앱처럼 돌리면서, 판단 구간 응답마다 오차를 낸다. maxSamples면 그만큼만
function simulate(q: Seq, o: Offsets, from: number, maxSamples = Infinity): Sample[] {
    const out: Sample[] = [];
    const actual = q.actual!;
    const end = q.arrivalIdx!;
    let state: { arrivalAt: number; remainingSec: number; basis: "first" | "changed"; cd: string } | null = null;
    let prevSnap = -1;
    for (let k = from; k < end && out.length < maxSamples; k++) {
        const e = q.entries[k];
        if (e.recptn >= actual) break;
        if (prevSnap >= 0 && e.snap - prevSnap > 1) state = null; // 응답에서 빠졌던 열차 → 맵에서 지워졌음
        prevSnap = e.snap;
        if (!usable(e)) { state = null; continue; }
        if (o.noAnchor) {
            state = { arrivalAt: e.recptn + e.barvl * 1000, remainingSec: e.barvl, basis: "first", cd: e.cd };
        } else if (!state) {
            state = { arrivalAt: e.recptn + (e.barvl - o.first(e.line, e.cd)) * 1000, remainingSec: e.barvl, basis: "first", cd: e.cd };
        } else if (e.barvl !== state.remainingSec) {
            state = { arrivalAt: e.recptn + (e.barvl - o.changed(e.line, e.cd)) * 1000, remainingSec: e.barvl, basis: "changed", cd: e.cd };
        }
        const before = (actual - e.recptn) / 1000;
        if (before > 0 && before <= WINDOW_SEC) {
            out.push({ line: q.line, cd: state.cd, basis: state.basis, err: (state.arrivalAt - actual) / 1000, group: group(q.trainNo) });
        }
    }
    return out;
}

function steady(seqs: Seq[], o: Offsets): Sample[] {
    return seqs.flatMap((q) => simulate(q, o, 0));
}

// 도착 1~7분 전에 앱을 연 경우마다 첫 응답 2개
function appOpen(seqs: Seq[], o: Offsets): Sample[] {
    const out: Sample[] = [];
    for (const q of seqs) {
        for (let s = 0; s < q.arrivalIdx!; s++) {
            const before = (q.actual! - q.entries[s].recptn) / 1000;
            if (before < 60 || before > 420 || !usable(q.entries[s])) continue;
            // 앱을 연 시점부터 첫 응답 2개 (판단 구간 밖이어도 센다)
            let state: { arrivalAt: number; remainingSec: number; basis: "first" | "changed"; cd: string } | null = null;
            for (let k = s; k < Math.min(s + 2, q.arrivalIdx!); k++) {
                const e = q.entries[k];
                if (!usable(e) || (k > s && e.snap - q.entries[k - 1].snap > 1)) { state = null; continue; }
                if (o.noAnchor) state = { arrivalAt: e.recptn + e.barvl * 1000, remainingSec: e.barvl, basis: "first", cd: e.cd };
                else if (!state) state = { arrivalAt: e.recptn + (e.barvl - o.first(e.line, e.cd)) * 1000, remainingSec: e.barvl, basis: "first", cd: e.cd };
                else if (e.barvl !== state.remainingSec) state = { arrivalAt: e.recptn + (e.barvl - o.changed(e.line, e.cd)) * 1000, remainingSec: e.barvl, basis: "changed", cd: e.cd };
                out.push({ line: q.line, cd: state.cd, basis: state.basis, err: (state.arrivalAt - q.actual!) / 1000, group: group(q.trainNo) });
            }
        }
    }
    return out;
}

// ── 통계 ───────────────────────────────────────────────────

function median(xs: number[]): number {
    if (!xs.length) return NaN;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
function score(xs: number[]) {
    return {
        n: xs.length,
        hit: pct(xs.filter((x) => Math.abs(x) <= HIT_SEC).length, xs.length),
        med: Math.round(median(xs)),
        late: pct(xs.filter((x) => x > HIT_SEC).length, xs.length),
        early: pct(xs.filter((x) => x < -HIT_SEC).length, xs.length),
    };
}

const ZERO: Offsets = { name: "보정 없음", first: () => 0, changed: () => 0 };
const A: Offsets = { name: "A 지금 공식(매 응답 기준, 참고)", first: () => 0, changed: () => 0, noAnchor: true };
const CURRENT: Offsets = { name: "C 지금 LINE_OFFSET_SEC", first: (l) => LINE_OFFSET_SEC[l] ?? 0, changed: () => 0 };

// 표본 → 노선 보정값 (처음 본 열차 오차의 중앙값)
function learnLine(samples: Sample[]): Record<string, { v: number; n: number }> {
    const out: Record<string, { v: number; n: number }> = {};
    for (const l of LINES) {
        const xs = samples.filter((s) => s.line === l).map((s) => s.err);
        out[l] = { v: Math.round(median(xs)), n: xs.length };
    }
    return out;
}
// 표본 → 상태보정표 (노선 × 고정할 때의 arvlCd × 처음/바뀜)
type Table = Record<string, { v: number; n: number }>;
const cell = (l: string, cd: string, b: string) => `${l}|${cd}|${b}`;
function learnTable(samples: Sample[]): Table {
    const buckets = new Map<string, number[]>();
    for (const s of samples) {
        const k = cell(s.line, s.cd, s.basis);
        buckets.set(k, [...(buckets.get(k) ?? []), s.err]);
    }
    const out: Table = {};
    for (const [k, xs] of buckets) out[k] = { v: Math.round(median(xs)), n: xs.length };
    return out;
}

function lineOffsets(learned: Record<string, { v: number; n: number }>): Offsets {
    return { name: "", first: (l) => (learned[l]?.n >= MIN_N ? learned[l].v : LINE_OFFSET_SEC[l] ?? 0), changed: () => 0 };
}
function tableOffsets(t: Table, line: Record<string, { v: number; n: number }>): Offsets {
    const get = (l: string, cd: string, b: string, fb: number) => (t[cell(l, cd, b)]?.n >= MIN_N ? t[cell(l, cd, b)].v : fb);
    const lineFb = (l: string) => (line[l]?.n >= MIN_N ? line[l].v : LINE_OFFSET_SEC[l] ?? 0);
    return { name: "", first: (l, cd) => get(l, cd, "first", lineFb(l)), changed: (l, cd) => get(l, cd, "changed", 0) };
}

// 처음 본 열차 표본: 판단 구간의 모든 응답을 「여기서 처음 봤다면」으로 본 오차 (= 지금 공식 A의 오차)
const firstSamples = (seqs: Seq[]) => seqs.flatMap((q) => simulate(q, A, 0));
// 상태보정표 표본: 처음 칸은 firstSamples, 바뀜 칸은 보정 없이 고정 규칙을 돌린 정상 상태의 바뀜 표본
const tableSamples = (seqs: Seq[]) => firstSamples(seqs).concat(steady(seqs, ZERO).filter((s) => s.basis === "changed"));

// 한쪽 무리에서 배우고 다른 쪽에 적용 (교차 검증)
function crossScore(seqs: Seq[], make: (trainSeqs: Seq[]) => Offsets, run: (s: Seq[], o: Offsets) => Sample[]) {
    const errs: number[] = [];
    for (const g of [0, 1]) {
        const trainSeqs = seqs.filter((q) => group(q.trainNo) === g);
        const testSeqs = seqs.filter((q) => group(q.trainNo) !== g);
        errs.push(...run(testSeqs, make(trainSeqs)).map((s) => s.err));
    }
    return score(errs);
}

// ── 출력 ───────────────────────────────────────────────────

function main(): void {
    const dir = pickDir();
    const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).length;
    const snaps = load(dir);
    if (snaps.length < 10) throw new Error(`정상 응답이 ${snaps.length}개뿐 — 최소 10개(약 3분)는 있어야 함`);

    const lines: string[] = [];
    const p = (s = "") => { lines.push(s); console.log(s); };
    const t = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(11, 19);

    const gaps = snaps.slice(1).map((s, i) => (s.fetchedAtMs - snaps[i].fetchedAtMs) / 1000);
    const date = path.basename(dir);
    const weekday = "일월화수목금토"[new Date(snaps[0].fetchedAtMs + 9 * 3600_000).getUTCDay()];
    const startHour = Number(t(snaps[0].fetchedAtMs).slice(0, 2)) + Number(t(snaps[0].fetchedAtMs).slice(3, 5)) / 60;
    const isRush = "월화수목금".includes(weekday) && startHour >= 7 && startHour < 9.5;
    const label = isRush ? "출근 시간 실측" : "실측 (평일 출근 시간 아님)";
    p(`# 노선 보정값 재측정 ${date}(${weekday}) ${t(snaps[0].fetchedAtMs)}–${t(snaps[snaps.length - 1].fetchedAtMs)} KST`);
    if (!isRush) p(`\n! 평일 07:00–09:30에 시작한 수집이 아님 — 3-6 확정값으로 쓰지 말고 참고만`);
    p();
    p(`## 1. 수집 품질`);
    p(`- 파일 ${files}개 중 정상(INFO-000) ${snaps.length}개 · 간격 중앙 ${median(gaps)}초 · 30초 넘게 벌어진 곳 ${gaps.filter((g) => g > 30).length}군데`);
    const lag = median(snaps.map((s) => s.fetchedAtMs - parseKst(s.rows[0]?.recptnDt ?? "")).filter(Number.isFinite)) / 1000;
    p(`- 받은 시각 − 생성 시각(recptnDt) 중앙 ${Math.round(lag)}초 (10-30 밤 약 42초)`);

    const seqs = buildSeqs(snaps);
    p(`- 정답(실제 도착)을 잡은 (역, 열차) ${seqs.length}개`);
    if (seqs.length < 50) p(`  ! 너무 적음 — 30분 넘게 수집해야 노선별 값이 나온다`);
    p();

    // 2. 노선 보정값
    const newLine = learnLine(firstSamples(seqs));
    p(`## 2. LINE_OFFSET_SEC (처음 본 열차의 오차 중앙값, 초. + = 늦게 예측 → 그만큼 뺀다)`);
    p();
    p(`| 노선 | 지금 값 | 이번 측정 | 차이 | 표본 |`);
    p(`|---|---|---|---|---|`);
    for (const l of LINES) {
        const cur = LINE_OFFSET_SEC[l] ?? 0;
        const m = newLine[l];
        const ok = m.n >= MIN_N;
        p(`| ${LINE_NAMES[l]} (${l}) | ${cur} | ${ok ? m.v : "−"} | ${ok ? (m.v - cur > 0 ? "+" : "") + (m.v - cur) : "−"} | ${m.n}${ok ? "" : " (부족, 지금 값 유지)"} |`);
    }
    p();
    p(`붙여 넣을 코드 (src/lib/arrivals.ts):`);
    p();
    p("```ts");
    p(`// ${date}(${weekday}) ${t(snaps[0].fetchedAtMs).slice(0, 5)}–${t(snaps[snaps.length - 1].fetchedAtMs).slice(0, 5)} ${label} (ALL 20초 간격, 표본 부족 노선은 10-29 값 유지)`);
    p(`export const LINE_OFFSET_SEC: Readonly<Record<string, number>> = {`);
    const vals = LINES.map((l) => `"${l}": ${newLine[l].n >= MIN_N ? newLine[l].v : LINE_OFFSET_SEC[l] ?? 0}`);
    p(`    ${vals.slice(0, 4).join(", ")},`);
    p(`    ${vals.slice(4).join(", ")},`);
    p(`};`);
    p("```");
    p();

    // 3. 상태보정표
    const table = learnTable(tableSamples(seqs));
    p(`## 3. 상태보정표 (10-30 제안 1 확인용, 초. 고정할 때의 arvlCd × 처음/바뀜. 표본 ${MIN_N} 미만은 −)`);
    p();
    p(`| 노선 | ${TABLE_CDS.flatMap((cd) => [`${cd} 바뀜`, `${cd} 첫`]).join(" | ")} |`);
    p(`|---|${TABLE_CDS.flatMap(() => ["---", "---"]).join("|")}|`);
    for (const l of LINES) {
        const cells = TABLE_CDS.flatMap((cd) =>
            ["changed", "first"].map((b) => {
                const c = table[cell(l, cd, b)];
                return c && c.n >= MIN_N ? `${c.v > 0 ? "+" : ""}${c.v}` : "−";
            }),
        );
        p(`| ${LINE_NAMES[l]} | ${cells.join(" | ")} |`);
    }
    p(`- arvlCd: 99 운행중 · 5 전역 도착 · 3 전역 출발 · 4 전역 진입 · 0 진입`);
    p();

    // 4. 비교 (교차 검증)
    const configs: { name: string; make: (trainSeqs: Seq[]) => Offsets }[] = [
        { name: A.name, make: () => A },
        { name: CURRENT.name, make: () => CURRENT },
        { name: "C 이번 측정 LINE_OFFSET_SEC", make: (tr) => lineOffsets(learnLine(firstSamples(tr))) },
        { name: "C + 상태보정표", make: (tr) => tableOffsets(learnTable(tableSamples(tr)), learnLine(firstSamples(tr))) },
    ];
    p(`## 4. 계산식 비교 (±${HIT_SEC}초 적중, 교차 검증)`);
    p();
    p(`| 계산식 | 정상 상태 적중 | 중앙 | 30초+ 늦게 | 막 열었을 때 적중 | 중앙 | 30초+ 늦게 |`);
    p(`|---|---|---|---|---|---|---|`);
    const results: { name: string; s: ReturnType<typeof score>; o: ReturnType<typeof score> }[] = [];
    for (const c of configs) {
        const s = crossScore(seqs, c.make, steady);
        const o = crossScore(seqs, c.make, appOpen);
        results.push({ name: c.name, s, o });
        p(`| ${c.name} | ${s.hit}% (${s.n}) | ${s.med > 0 ? "+" : ""}${s.med}초 | ${s.late}% | ${o.hit}% (${o.n}) | ${o.med > 0 ? "+" : ""}${o.med}초 | ${o.late}% |`);
    }
    const [, cur, neu, tab] = results;
    p();
    p(`- 이번 측정값으로 바꾸면: 정상 ${signed(neu.s.hit - cur.s.hit)}%p, 막 열었을 때 ${signed(neu.o.hit - cur.o.hit)}%p (지금 값 대비)`);
    p(`- 상태보정표까지 가면: 정상 ${signed(tab.s.hit - neu.s.hit)}%p, 막 열었을 때 ${signed(tab.o.hit - neu.o.hit)}%p (이번 측정 LINE_OFFSET_SEC 대비)`);
    p(`  10-30 밤 기준선: C 69% → C+상태보정 75% (정상), 57% → 60% (막 열었을 때)`);
    p();

    // 5. 까치산 2호선 — 앱에서 쓸 수 있는 행(종착 아님, barvlDt > 0)이 응답의 몇 %에 있었나
    p(`## 5. 까치산 2호선 (ROW_OVERRIDES 2519 판단)`);
    const kk = snaps.map((s) => s.rows.filter((r) => r.subwayId === "1002" && r.statnNm === "까치산"));
    const isUsable = (r: { bstatnId: string; statnId: string; barvlDt: string }) => r.bstatnId !== r.statnId && Number(r.barvlDt) > 0;
    const usableSnaps = kk.filter((rs) => rs.some(isUsable)).length;
    const share = pct(usableSnaps, snaps.length);
    const dests = [...new Set(kk.flat().map((r) => `${r.updnLine} ${r.bstatnNm}행${r.bstatnId === r.statnId ? "(종착)" : ""}`))];
    p(`- 보인 행선지: ${dests.join(", ") || "없음"}`);
    p(`- 앱에서 쓸 수 있는 열차(종착 아님, 남은 시간 있음)가 있던 응답: ${usableSnaps} / ${snaps.length} (${share}%)`);
    p(share >= 80
        ? `- → 대부분 판정됨: 2519 줄 유지`
        : share < 50
            ? `- → 절반 넘게 「열차 없음」: 2519 줄을 지우는 쪽 (남은 시간을 못 주는 역은 목록에서 뺀다는 10-29 결정과 같은 이유)`
            : `- → 애매함: 다른 날 한 번 더 보고 결정`);
    writeFileSync(path.join(dir, "report.md"), lines.join("\n") + "\n");
    console.log(`\n저장: ${path.relative(process.cwd(), path.join(dir, "report.md"))}`);

}

const signed = (x: number) => (x > 0 ? `+${x}` : `${x}`);

try {
    main();
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}
