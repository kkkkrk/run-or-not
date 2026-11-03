import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "뛸까말까",
  description: "지하철 도착 시간과 이동 시간을 고려한 출발 타이밍 안내 서비스",
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
