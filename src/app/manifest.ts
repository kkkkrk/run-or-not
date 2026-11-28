import type { MetadataRoute } from "next";

// 안드로이드 Chrome 「홈 화면에 설치」에 필요한 웹 앱 매니페스트.
// Next가 /manifest.webmanifest로 내보내고 <head>에 <link rel="manifest">를 붙인다.
//
// 아이콘은 apple-icon.png와 같은 A2(v39 로고 묶음 8 「apple-icon 원본」, 모서리 없음 · 투명 없음)를
// 192 · 512로 찍은 것이다. A2는 그림이 가운데 원(지름의 38.9%) 안에 다 들어가서 maskable 안전 영역(40%)도
// 그대로 맞는다 — 그래서 같은 파일을 any · maskable 둘 다로 올린다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "뛸까말까",
    short_name: "뛸까말까",
    description: "지금 뛰면 탈 수 있을까?",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // 첫 화면(역 찾기)의 바탕색 — 결정.md 2절 「역 찾기 · 설정은 흰 바탕(#F1F5F9)」.
    // background_color는 열 때 잠깐 뜨는 시작 화면 색, theme_color는 위 상태 표시줄 색이다
    background_color: "#F1F5F9",
    theme_color: "#F1F5F9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
