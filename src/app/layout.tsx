import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

// 문구와 값은 design/v32.html 로고 묶음 7 「만들 파일」의 metadata 그대로 (plan.md U4).
// 아이콘과 공유 이미지 태그는 여기 적지 않는다 — 이 폴더의 favicon.ico · icon.svg · apple-icon.png ·
// opengraph-image.png(+ .alt.txt)를 Next가 읽어서 <head>에 붙인다.
export const metadata: Metadata = {
  // 공유 이미지 주소(og:image)는 「https://…」로 시작하는 전체 주소여야 해서, 앞에 붙일 배포 주소를 알려 준다
  metadataBase: new URL("https://run-or-not.vercel.app"),
  title: {
    default: "뛸까말까",
    template: "%s · 뛸까말까",
  },
  description: "지금 뛰면 탈 수 있을까?",
  // 카톡 · 메신저 링크 미리보기에 나오는 글자. 역 페이지는 title만 바꾸므로 여기 값이 그대로 내려간다
  // (어느 링크든 같은 카드 — v32 로고 묶음 5)
  openGraph: {
    title: "뛸까말까",
    description: "지금 뛰면 탈 수 있을까?",
    siteName: "뛸까말까",
    locale: "ko_KR",
    type: "website",
  },
};

// Next 기본값과 같지만, 나중에 themeColor 등을 더할 자리로 명시해 둔다
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        {/* PC: 가운데 600px 컬럼 + 좌우 회색 / 휴대폰: w-full로 꽉 참 */}
        <div className="mx-auto w-full max-w-150 min-h-dvh bg-white shadow">
          <QueryProvider>{children}</QueryProvider>
        </div>
      </body>
    </html>
  );
}
