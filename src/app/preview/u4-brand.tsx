import Image from "next/image";
import { BoardTitle, Group, WRAP } from "./kit";

/*
 * U4 미리보기 — 파비콘 · 홈 화면 아이콘 · 카톡 미리보기 · README 배너
 * (plan.md U4, 시안 v32 「로고 · 앱 아이콘 · 파비콘 · 공유 이미지」 묶음).
 *
 * 여기 그림은 다시 그린 것이 아니라 브라우저가 실제로 받는 파일이다. src/app의 favicon.ico · icon.svg · apple-icon.png ·
 * opengraph-image.png를 Next가 같은 이름의 주소(/favicon.ico …)로 내보내고, 이 페이지는 그 주소를 그림으로 띄운다.
 * 파일은 v32의 SVG 원본을 그대로 찍어 만든 것이라, U4에는 src/ui 컴포넌트가 없다.
 *
 * 탭 띠 · 홈 화면 모서리 · 카톡 카드는 그 파일이 쓰이는 자리를 흉내 낸 꾸밈이다 (크기 · 색은 v32 CSS 15절의
 * .lg-tabstrip · .lg-tab · .lg-chat · .lg-kcard). 앱 화면에는 없는 것이고, 색도 앱의 토큰이 아니라
 * 흉내 내는 대상(브라우저 탭 · 카톡)의 색이라 대괄호 값으로 적었다.
 *
 * next/image에 unoptimized를 준 까닭: 크기를 줄여 다시 만든 그림이 아니라 파일 그대로를 받아 와야 해서.
 * (크기 클래스의 숫자 × 4 = px: w-68 = 272 · w-67 = 268 · h-8.5 = 34 · gap-3.5 = 14 · gap-0.75 = 3 · mt-1.25 = 5 · py-5.5 = 22)
 */

/**
 * 흉내 칸(탭 띠 · 카톡 카드) 안의 글자는 앱 화면의 줄 높이(1.4) · 자간(−0.015em)을 물려받지 않게 푼다 —
 * v32의 이 그림들은 브라우저 기본값(normal)으로 그려져 있다. 그래야 카드 높이가 v32와 같다 (268 × 210)
 */
const MOCK_TEXT = "leading-[normal] tracking-normal";

/** 역 페이지의 탭 제목 모양 — layout.tsx의 title.template 「%s · 뛸까말까」에 역 이름과 호선이 들어간 것 (v32와 같은 예시) */
const TAB_TITLE = "건대입구 7호선 · 뛸까말까";

/** 브라우저 탭 흉내 (v32 .lg-tabstrip · .lg-tab) — 띠 272px, 탭 높이 34px, 아이콘 16px */
const TABS = [
    { name: "밝은 탭", strip: "bg-[#E5E7EB]", tab: "bg-white text-[#1F2937]" },
    { name: "어두운 탭", strip: "bg-[#111827]", tab: "bg-[#374151] text-[#F9FAFB]" },
];

/**
 * 홈 화면이 아이콘을 자르는 모양 (v32 로고 묶음 3). 파일은 모서리 없는 정사각형이고 둥근 모서리는 iOS · 안드로이드가 자른다.
 * 22.5% = v32의 둥근 칸 반지름 45/200
 */
const HOME = [
    { name: "파일 그대로", note: "180 × 180", size: 180, mask: "" },
    { name: "홈 화면에서", note: "120", size: 120, mask: "rounded-[22.5%]" },
    { name: "홈 화면에서", note: "64", size: 64, mask: "rounded-[22.5%]" },
    { name: "안드로이드 원형", note: "64", size: 64, mask: "rounded-full" },
];

/**
 * 카톡 카드에 나오는 글자 — layout.tsx metadata(openGraph)와 opengraph-image.alt.txt의 값을 옮겨 적은 예시다.
 * 실제로 나가는 값은 페이지 소스의 og: 태그로 본다
 */
const OG = {
    title: "뛸까말까",
    description: "지금 뛰면 탈 수 있을까?",
    host: "run-or-not.vercel.app",
    alt: "빨간 바탕에 ‘지금 뛰어요!’와 뛰는 사람",
};

export function U4BrandPreview() {
    return (
        <section className="px-5 pb-20 break-keep" aria-labelledby="u4-title">
            <h2 id="u4-title" className="text-wordmark">
                U4 · 파비콘 · 홈 화면 아이콘 · 카톡 미리보기
            </h2>
            <p className="mt-1.5 max-w-245 text-13 font-semibold text-sub">
                시안 design/v32.html의 「로고 · 앱 아이콘 · 파비콘 · 공유 이미지」 묶음과 나란히 놓고 봐요. 여기 그림은 다시
                그린 게 아니라 브라우저가 실제로 받는 파일이에요 (/favicon.ico · /icon.svg · /apple-icon.png ·
                /opengraph-image.png). 탭 띠 · 홈 화면 모서리 · 카톡 카드는 그 파일이 쓰이는 자리를 흉내 낸 것이고, 진짜
                확인은 브라우저 탭 · 휴대폰 홈 화면 · 카카오 공유 디버거에서 해요.
            </p>

            <Group
                title="파비콘 — F2"
                note="브라우저 탭 · 북마크에 쓰여요. 앱 아이콘(A2)을 16px로 줄이면 옅은 뒤 팔다리가 흐려져서, 탭에서만 같은 사람과 속도선을 흰 한 색으로 그리고 뒤 팔다리는 빨강 틈으로 나눴어요. icon.svg는 SVG 파비콘을 읽는 브라우저가 쓰고, favicon.ico는 못 읽는 브라우저가 써요."
            >
                <div className={WRAP}>
                    <div>
                        <BoardTitle name="icon.svg" note="48 · 32 · 16 실제 크기" />
                        <div className="flex items-end gap-3.5">
                            <Image src="/icon.svg" alt="파비콘 F2" width={48} height={48} unoptimized />
                            <Image src="/icon.svg" alt="" width={32} height={32} unoptimized />
                            <Image src="/icon.svg" alt="" width={16} height={16} unoptimized />
                        </div>
                    </div>

                    <div>
                        <BoardTitle name="브라우저 탭에서" note="16px · 밝은 탭과 어두운 탭" />
                        <ul className="flex flex-col gap-3">
                            {TABS.map(({ name, strip, tab }) => (
                                <li
                                    key={name}
                                    aria-label={name}
                                    className={`w-68 rounded-[10px] px-2.5 pt-1.5 ${MOCK_TEXT} ${strip}`}
                                >
                                    <div
                                        className={`flex h-8.5 items-center gap-2 overflow-hidden rounded-t-[9px] px-3 text-12.5 font-medium whitespace-nowrap ${tab}`}
                                    >
                                        <Image
                                            src="/icon.svg"
                                            alt=""
                                            width={16}
                                            height={16}
                                            unoptimized
                                            className="flex-none"
                                        />
                                        <span>{TAB_TITLE}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <BoardTitle
                            name="favicon.ico"
                            note="16 · 32 · 48이 한 파일에 — 그림으로 띄우면 그중 한 크기만 보여요"
                        />
                        <Image src="/favicon.ico" alt="favicon.ico" width={48} height={48} unoptimized />
                    </div>
                </div>
            </Group>

            <Group
                title="앱 아이콘 — A2"
                note="휴대폰 홈 화면에 추가했을 때 쓰여요 (apple-icon.png). 빨강 칸에 흰 사람과 속도선 두 줄, 뒤 팔다리는 옅은 색이에요. 파일은 모서리 없는 정사각형이고 투명한 곳이 없어요 — 둥근 모서리는 iOS · 안드로이드가 알아서 잘라요."
            >
                <ul className="flex flex-wrap items-end gap-7">
                    {HOME.map(({ name, note, size, mask }) => (
                        <li key={`${name} ${note}`}>
                            <BoardTitle name={name} note={note} />
                            <Image
                                src="/apple-icon.png"
                                alt={size === 180 ? "앱 아이콘 A2" : ""}
                                width={size}
                                height={size}
                                unoptimized
                                className={mask}
                            />
                        </li>
                    ))}
                </ul>
            </Group>

            <Group
                title="카톡 미리보기 — S1"
                note="어느 링크든 같은 이미지 하나예요 (역 링크도). 설명 줄의 질문 「지금 뛰면 탈 수 있을까?」에 이미지가 「지금 뛰어요!」로 답하는 짝이에요. 이미지를 바꾸면 카톡 서버와 기기에 남아 있는 옛 그림이 한동안 보일 수 있어요 — 카카오 공유 디버거에서 캐시를 지워요."
            >
                <div className={WRAP}>
                    <div>
                        <BoardTitle name="opengraph-image.png" note="1200 × 600 (2:1) — 여기서는 절반 크기로" />
                        <Image
                            src="/opengraph-image.png"
                            alt={OG.alt}
                            width={600}
                            height={300}
                            unoptimized
                            className="h-auto max-w-full rounded-[12px]"
                        />
                    </div>

                    <div>
                        <BoardTitle name="카톡 대화방에서" note="실제 크기쯤 · 글자는 예시" />
                        <div className={`flex items-end gap-1.5 rounded-[20px] bg-[#BACEE0] px-6 py-5.5 ${MOCK_TEXT}`}>
                            <span className="text-[10.5px] whitespace-nowrap text-[#4B5B6B]">오후 4:31</span>
                            <div className="w-67 overflow-hidden rounded-[10px] bg-white shadow-[0_0_0_1px_rgb(15_23_42/0.06)]">
                                <Image src="/opengraph-image.png" alt="" width={268} height={134} unoptimized />
                                <div className="flex flex-col gap-0.75 px-3 pt-2.5 pb-2.75">
                                    <b className="text-14 font-bold text-[#111827]">{OG.title}</b>
                                    <span className="text-12.5 text-[#4B5563]">{OG.description}</span>
                                    <small className="mt-1.25 text-[11px] text-[#6B7280]">{OG.host}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Group>

            <Group
                title="README 배너 — R2"
                note="「뛸까말까」와 한 줄 소개, 뛰는 사람. 깃허브 README 맨 위에 넣을 그림이에요 (넣는 건 F 단계)."
            >
                <p className="max-w-245 text-13 font-semibold text-sub">
                    <b className="font-extrabold text-ink">docs/banner.png</b> · 2560 × 800 (1280 × 400의 2배). 앱이 내보내는
                    파일이 아니라서 여기에는 띄우지 않았어요 — 편집기에서 파일을 열어 봐요.
                </p>
            </Group>
        </section>
    );
}
