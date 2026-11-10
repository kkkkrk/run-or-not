import { StationSearch } from "@/components/station/station-search";

// 서버 컴포넌트로 두고, 입력·키보드가 필요한 검색만 StationSearch('use client')로 나눈다.
// 그래서 이 페이지는 빌드 때 정적 HTML(○)로 만들어진다
export default function MainPage() {
  return (
    <main className="flex flex-col gap-8 px-4 pt-16 pb-8">
      <h1 className="text-center text-4xl font-bold text-slate-800">뛸까말까</h1>
      <StationSearch />
    </main>
  );
}
