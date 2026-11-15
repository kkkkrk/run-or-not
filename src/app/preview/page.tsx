import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { U1CharacterPreview } from "./u1-character";
import { U2FullScreen, U2VerdictPreview } from "./u2-verdict";

export const metadata: Metadata = { title: "미리보기" };

/**
 * UI 미리보기 — 새 화면(src/ui)의 모든 상태를 가짜 데이터로 띄워 보는 곳 (plan.md 1-2 · 1-3).
 * U마다 묶음 파일이 하나씩 붙는다 (u1-character.tsx · u2-verdict.tsx …). 가짜 데이터와 가짜 상태는 이 폴더 안에만 둔다.
 *
 *   /preview              전체 목록
 *   /preview?screen=이름   화면 한 장만, 실제 페이지처럼 브라우저 가득 (이름은 u2-cases.ts의 id)
 */
export default async function PreviewPage({ searchParams }: PageProps<"/preview">) {
    // VERCEL_ENV는 Vercel이 넣어 주는 값이다: production(실제 주소) · preview(브랜치 주소) · development.
    // 로컬에는 없다(undefined). 실제 주소에서만 「없는 페이지」가 되게 한다
    if (process.env.VERCEL_ENV === "production") notFound();

    // 한 장만 볼 때는 아무것도 감싸지 않는다 — layout.tsx의 가운데 600px 칸 안에 화면 컴포넌트만 놓인다 (실제 역 페이지와 같은 조건)
    const { screen } = await searchParams;
    if (typeof screen === "string") return <U2FullScreen id={screen} />;

    return (
        // 목록은 휴대폰 칸을 옆으로 여러 장 늘어놓아야 해서, layout.tsx의 600px 칸을 벗어나 브라우저 화면 전체를 쓴다 (fixed + 자체 스크롤)
        <div className="fixed inset-0 overflow-auto bg-canvas text-15 leading-body tracking-body text-ink">
            <div className="mx-auto max-w-150 px-3 py-6">
                <h1 className="px-2 text-wordmark">미리보기</h1>
                <p className="mt-1 px-2 text-13 font-semibold text-sub">
                    <a href="#u1-title" className="underline underline-offset-[3px]">
                        U1 · 캐릭터와 열차 줄 아이콘
                    </a>
                    {" · "}
                    <a href="#u2-title" className="underline underline-offset-[3px]">
                        U2 · 판정 화면
                    </a>
                </p>
                <U1CharacterPreview />
            </div>
            <U2VerdictPreview />
        </div>
    );
}
