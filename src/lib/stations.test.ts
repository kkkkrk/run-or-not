// src/lib/stations.test.ts
// 역명판 양옆 칸에 들어갈 방향별 다음 역(next)을 고정한다 (plan v3 L2)
// stations.json은 scripts/build-stations.ts가 만든 결과다. 원본을 다시 받아 만들었을 때 아래 칸이 바뀌면 여기서 잡힌다
//   next.up · next.down = 그 방향의 다음 역 표시명. 없으면 null (끝 역 · 한 방향 구간)
// 598칸을 다 적지 않고, 눈으로 잡기 어려운 칸(순환 · 지선 · 끝 역 · 예외 · 제외된 이웃)만 확인한다
import { describe, expect, it } from "vitest";
import { allStations } from "@/lib/stations";

// ── 도우미 ──────────────────────────────────────────────────

// 역 이름 + 호선으로 찾는다 (id보다 읽기 쉽다). 없는 역이면 테스트가 바로 실패하게 던진다
function nextOf(name: string, lineName: string) {
    const station = allStations.find((s) => s.name === name && s.lineName === lineName);
    if (!station) throw new Error(`역이 없음: ${lineName} ${name}`);
    return station.next;
}

// ── 1. 순환 · 끝 역 · 지선 ──────────────────────────────────

describe("1. 순환 · 끝 역 · 지선", () => {
    it("2호선 순환: 시청은 양쪽이 다 있다 (up 내선 · down 외선)", () => {
        expect(nextOf("시청", "2호선")).toEqual({ up: "을지로입구", down: "충정로" });
    });
    it("끝 역: 오금(3호선)은 down이 없다", () => {
        expect(nextOf("오금", "3호선")).toEqual({ up: "경찰병원", down: null });
    });
    it("지선 가운데: 둔촌동(5호선 마천 지선)의 up은 갈라지는 역 강동", () => {
        expect(nextOf("둔촌동", "5호선")).toEqual({ up: "강동", down: "올림픽공원" });
    });
    it("지선이 갈라지는 역은 본선 쪽 이름 하나만 들어 있다", () => {
        expect(nextOf("강동", "5호선")).toEqual({ up: "천호", down: "길동" });
        expect(nextOf("성수", "2호선")).toEqual({ up: "건대입구", down: "뚝섬" });
        expect(nextOf("신도림", "2호선")).toEqual({ up: "문래", down: "대림" });
    });
});

// ── 2. 원본을 그대로 쓰면 틀리는 칸 (build-stations NEXT_OVERRIDES) ──

describe("2. 원본을 그대로 쓰면 틀리는 칸", () => {
    it("까치산(2호선): 지선 종점이라 up은 없고, down은 신정네거리 (원본은 빈 배열)", () => {
        expect(nextOf("까치산", "2호선")).toEqual({ up: null, down: "신정네거리" });
    });
    it("불암산(4호선): 끝 역이 아니다 (원본은 up 자기 역 · down 빈 배열)", () => {
        expect(nextOf("불암산", "4호선")).toEqual({ up: "별내별가람", down: "상계" });
    });
    it("종합운동장(9호선): up은 삼전 (원본은 급행 행의 자기 역)", () => {
        expect(nextOf("종합운동장", "9호선")).toEqual({ up: "삼전", down: "봉은사" });
    });
    it("응암(6호선): up은 순환으로 들어가는 역촌, down은 순환을 돌아 나가는 새절", () => {
        expect(nextOf("응암", "6호선")).toEqual({ up: "역촌", down: "새절" });
    });
    it("응암 순환 구간은 한 방향(down)으로만 돈다", () => {
        expect(nextOf("역촌", "6호선")).toEqual({ up: null, down: "불광" });
        expect(nextOf("불광", "6호선")).toEqual({ up: null, down: "독바위" });
        expect(nextOf("독바위", "6호선")).toEqual({ up: null, down: "연신내" });
        expect(nextOf("연신내", "6호선")).toEqual({ up: null, down: "구산" });
        expect(nextOf("구산", "6호선")).toEqual({ up: null, down: "응암" });
    });
});

// ── 3. 다음 역이 제외된 역 ──────────────────────────────────
// 이 칸들은 build-stations의 빈칸 검사가 못 잡는다 (가리켜 줄 이웃이 남은 역에 없어서) → 여기서 고정

describe("3. 다음 역이 제외된 역이어도 이름은 나온다", () => {
    it.each([
        ["연신내", "3호선", "up", "구파발"],
        ["불암산", "4호선", "up", "별내별가람"],
        ["동작", "4호선", "down", "총신대입구"],
        ["상일동", "5호선", "down", "강일"],
        ["도봉산", "7호선", "up", "장암"],
    ] as const)("%s(%s) %s → %s", (name, lineName, dir, expected) => {
        expect(nextOf(name, lineName)[dir]).toBe(expected);
    });
});

// ── 4. 이름은 표시명 ────────────────────────────────────────

describe("4. 이름은 API 역명이 아니라 표시명이다", () => {
    it("같은 API 역명 「총신대입구(이수)」도 호선마다 표시명이 다르다", () => {
        expect(nextOf("내방", "7호선").down).toBe("이수");
        expect(nextOf("동작", "4호선").down).toBe("총신대입구");
    });
    it("「서울」 → 서울역, 「응암순환(상선)」 → 응암, 「4.19 민주묘지」 → 4.19민주묘지", () => {
        expect(nextOf("회현", "4호선").down).toBe("서울역");
        expect(nextOf("새절", "6호선").up).toBe("응암");
        expect(nextOf("솔밭공원", "우이신설선").up).toBe("4.19민주묘지");
    });
    it("괄호나 공백이 남은 이름이 없다", () => {
        const names = allStations.flatMap((s) => [s.next.up, s.next.down]).filter((n): n is string => n !== null);
        expect(names.filter((n) => /[()\s]/.test(n))).toEqual([]);
    });
});

// ── 5. 빈칸 ─────────────────────────────────────────────────
// 빈칸은 누를 수 없는 칸이라(결정.md 1절) 잘못 비면 그 방면을 못 고른다 → 목록을 통째로 고정

describe("5. 빈칸은 끝 역과 응암 순환 구간뿐이다", () => {
    it("16칸", () => {
        const empty = allStations.flatMap((s) =>
            (["up", "down"] as const).filter((dir) => s.next[dir] === null).map((dir) => `${s.lineName} ${s.name} ${dir}`),
        );
        expect(empty.sort()).toEqual(
            [
                "2호선 신설동 up", "2호선 까치산 up",
                "3호선 오금 down",
                "5호선 방화 up", "5호선 마천 down",
                "6호선 역촌 up", "6호선 불광 up", "6호선 독바위 up", "6호선 연신내 up", "6호선 구산 up", "6호선 신내 down",
                "7호선 석남 down",
                "9호선 개화 down", "9호선 중앙보훈병원 up",
                "우이신설선 북한산우이 down", "우이신설선 신설동 up",
            ].sort(),
        );
    });
    it("양쪽이 다 빈 역은 없다 (어느 방면도 못 고르는 역)", () => {
        expect(allStations.filter((s) => s.next.up === null && s.next.down === null)).toEqual([]);
    });
});
