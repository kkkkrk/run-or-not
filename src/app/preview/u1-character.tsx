import type { CharacterPose, ScreenTone, TrainKind } from "@/types/ui";
import { Character } from "@/ui/character/character";
import { TrainIcon } from "@/ui/character/train-icon";

/*
 * U1 미리보기 — 상태색 6개 바탕 위에 가운데 캐릭터 자세 전부 · 열차 줄 아이콘 전부 (plan.md U1 3)).
 * 아래 표들은 미리보기에서만 쓰는 가짜 데이터다.
 *
 * 화면 틀(U2)이 아직 없어서, 틀이 줄 값을 여기서 직접 준다 (character.module.css 맨 위 「바깥에서 받는 것」):
 *   바탕색 · --screen-bg(캐릭터 뒤쪽 팔다리 색에 섞인다) · data-tone(흰 화면이면 캐릭터가 회색)
 */

type Swatch = {
    tone: ScreenTone;
    title: string;        // 이 색을 쓰는 화면
    token: string;        // 결정.md 2절의 토큰 이름과 값
    className: string;    // 바탕색 + --screen-bg. Tailwind가 찾을 수 있게 완성된 글자로 적는다
    pose: CharacterPose;  // 이 색 화면에 실제로 나오는 자세
};

const SWATCHES: Swatch[] = [
    { tone: "walk", title: "걸어도 돼요", token: "--walk #1E9B50", className: "bg-walk [--screen-bg:var(--color-walk)]", pose: "walk" },
    { tone: "slow", title: "천천히 걸어요", token: "--slow #2979DE", className: "bg-slow [--screen-bg:var(--color-slow)]", pose: "slow" },
    { tone: "run", title: "지금 뛰어요!", token: "--run #E0352B", className: "bg-run [--screen-bg:var(--color-run)]", pose: "run" },
    { tone: "tight", title: "빨리 뛰어봐요!", token: "--tight #B31237", className: "bg-tight [--screen-bg:var(--color-tight)]", pose: "tight" },
    { tone: "miss", title: "탈 열차가 아직 안 보여요", token: "--miss #6D4AE0", className: "bg-miss [--screen-bg:var(--color-miss)]", pose: "phone" },
    { tone: "deadend", title: "막다른 화면", token: "--none #5F6E82", className: "bg-deadend [--screen-bg:var(--color-deadend)]", pose: "stand" },
];

const POSES: { pose: CharacterPose; name: string; cycle: string }[] = [
    { pose: "stand", name: "서 있기", cycle: "멈춤" },
    { pose: "walk", name: "걷기", cycle: "1000ms" },
    { pose: "slow", name: "천천히 걷기", cycle: "1450ms" },
    { pose: "run", name: "뛰기", cycle: "580ms" },
    { pose: "tight", name: "급하게 뛰기", cycle: "430ms" },
    { pose: "phone", name: "서서 폰 보기", cycle: "숨쉬기 3초" },
];

const KINDS: { kind: TrainKind; name: string; cycle: string }[] = [
    { kind: "walk", name: "걸어도 타요", cycle: "1000ms" },
    { kind: "slow", name: "천천히 걸어도 타요", cycle: "1450ms" },
    { kind: "run", name: "뛰면 타요", cycle: "580ms" },
    { kind: "tight", name: "아슬아슬", cycle: "430ms" },
    { kind: "miss", name: "못 타요", cycle: "멈춤" },
];

/** 캐릭터 무대 흉내 — v32 .stage와 같게: 높이는 844 높이 화면의 24%(202.56px), 아래 가운데 맞춤.
 *  실제 무대는 화면 폭 전체라 뛸 때 두 줄이 잘리지 않는다. 여기는 칸이 좁아서 칸 밖으로 나가게 두고, 바탕 끝에서만 자른다 */
const STAGE = "flex h-[202.56px] items-end justify-center";

function CharacterGrid({ realPose }: { realPose: CharacterPose }) {
    return (
        <ul className="mt-1 grid grid-cols-2 gap-x-2 gap-y-4 min-[560px]:grid-cols-3">
            {POSES.map(({ pose, name, cycle }) => (
                <li key={pose}>
                    <div className={STAGE}>
                        <Character pose={pose} />
                    </div>
                    <p className="mt-1.5 text-center text-12 font-semibold text-on-sub">
                        <b className="font-extrabold text-on-ink">{pose}</b> {name} · {cycle}
                        {pose === realPose && (
                            <span className="mt-1 block font-bold text-on-ink">↑ 이 색 화면의 자세</span>
                        )}
                    </p>
                </li>
            ))}
        </ul>
    );
}

/** 열차 줄처럼 아래쪽을 맞춰 나란히 — 아이콘 바닥선이 한 줄로 이어져 보여야 한다 (결정.md 3절 「숫자 줄 아래에 맞춘다」) */
function IconRow({ isTarget }: { isTarget: boolean }) {
    // 못 타는 열차는 판정 대상이 될 수 없어서 대상 줄에는 넣지 않는다
    const kinds = isTarget ? KINDS.filter(({ kind }) => kind !== "miss") : KINDS;

    return (
        <ul className="mt-1 flex flex-wrap items-start gap-x-2 gap-y-3">
            {kinds.map(({ kind, name, cycle }) => (
                <li key={kind} className="flex w-18 flex-col items-center">
                    {/* 가장 큰 아이콘 높이(42px)에 맞춘 칸 */}
                    <div className="flex h-10.5 items-end">
                        <TrainIcon kind={kind} isTarget={isTarget} />
                    </div>
                    <p className="mt-1.5 text-center text-12 font-semibold text-on-sub">
                        <b className="block font-extrabold text-on-ink">{kind}</b>
                        {name}
                        <span className="block">{cycle}</span>
                    </p>
                </li>
            ))}
        </ul>
    );
}

export function U1CharacterPreview() {
    return (
        <section className="mt-6 break-keep" aria-labelledby="u1-title">
            <h2 id="u1-title" className="px-2 text-16 font-extrabold">
                U1 · 캐릭터와 열차 줄 아이콘
            </h2>
            <p className="mt-1 px-2 text-13 font-semibold text-sub">
                상태색 6개 바탕 위에 가운데 캐릭터 자세 6개와 열차 줄 아이콘 5종. 맨 아래는 흰 화면의 서 있는 자세.
                한 바퀴는 걷기 1000 · 천천히 1450 · 뛰기 580 · 급하게 430ms.
            </p>

            <div className="mt-3 flex flex-col gap-3">
                {SWATCHES.map(({ tone, title, token, className, pose }) => (
                    <section
                        key={tone}
                        data-tone={tone}
                        className={`overflow-hidden rounded-[20px] px-3 py-4 text-on-ink ${className}`}
                    >
                        <h3 className="px-1 text-15 font-extrabold">
                            {title} <span className="ml-1 text-12 font-semibold text-on-faint">{token}</span>
                        </h3>

                        <h4 className="mt-4 px-1 text-12 font-bold text-on-sub">가운데 캐릭터</h4>
                        <CharacterGrid realPose={pose} />

                        <h4 className="mt-5 px-1 text-12 font-bold text-on-sub">
                            열차 줄 아이콘 — 나머지 열차 28px (못 타요는 1.3배 36.4px · 진하기 70%)
                        </h4>
                        <IconRow isTarget={false} />

                        <h4 className="mt-4 px-1 text-12 font-bold text-on-sub">열차 줄 아이콘 — 판정 대상 42px</h4>
                        <IconRow isTarget />
                    </section>
                ))}

                {/* 흰 화면(판정 전): 승강장까지 몇 분? · 위치 확인 중. 캐릭터는 서 있는 자세만 나오고 열차 줄 아이콘은 없다 */}
                <section
                    data-tone="white"
                    className="overflow-hidden rounded-[20px] border border-line bg-canvas px-3 py-4 [--screen-bg:var(--color-canvas)]"
                >
                    <h3 className="px-1 text-15 font-extrabold">
                        흰 화면 · 판정 전 <span className="ml-1 text-12 font-semibold text-sub">바탕 #F1F5F9</span>
                    </h3>
                    <p className="mt-1 px-1 text-12 font-semibold text-sub">
                        승강장까지 몇 분? · 위치 확인 중. 서 있는 자세만 나와요 — 사람 #64748B · 바닥 점선 #CBD5E1
                    </p>
                    <div className={`mt-3 ${STAGE}`}>
                        <Character pose="stand" />
                    </div>
                    <p className="mt-1.5 text-center text-12 font-semibold text-sub">
                        <b className="font-extrabold text-ink">stand</b> 서 있기 · 멈춤
                    </p>
                </section>
            </div>
        </section>
    );
}
