import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { U1CharacterPreview } from "./u1-character";

export const metadata: Metadata = { title: "미리보기" };

/**
 * UI 미리보기 — 새 화면(src/ui)의 모든 상태를 가짜 데이터로 띄워 보는 곳 (plan.md 1-2 · 1-3).
 * U마다 묶음 파일이 하나씩 붙는다 (u1-character.tsx …). 가짜 데이터와 가짜 상태는 이 폴더 안에만 둔다.
 */
export default function PreviewPage() {
    // VERCEL_ENV는 Vercel이 넣어 주는 값이다: production(실제 주소) · preview(브랜치 주소) · development.
    // 로컬에는 없다(undefined). 실제 주소에서만 「없는 페이지」가 되게 한다
    if (process.env.VERCEL_ENV === "production") notFound();

    return (
        <main className="min-h-dvh bg-canvas px-3 py-6 text-15 leading-body tracking-body text-ink">
            <h1 className="px-2 text-wordmark">미리보기</h1>
            <U1CharacterPreview />
        </main>
    );
}
