import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "뛸까말까",
    template: "%s · 뛸까말까"
  },
  description: "지하철 도착 시간과 이동 시간을 고려한 출발 타이밍 안내 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        <div className="mx-auto w-full max-w-150 min-h-dvh bg-white shadow">
          {children}
        </div>
      </body>
    </html>
  );
}
