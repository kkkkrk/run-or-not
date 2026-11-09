import { Skeleton } from "@/components/ui/skeleton"

// 역 화면 뼈대. loading.tsx(페이지 이동 중)와 StationView(복원·첫 로딩 중)가 같이 써서
// 둘이 이어져도 화면이 바뀌지 않는다.
export function StationSkeleton() {
    return (
        <div className="min-h-screen flex flex-col justify-between" role="status">
            <span className="sr-only">도착 정보를 불러오는 중</span>
            {/* 헤더: 뒤로 · 역 이름 · 빈 칸(설정 버튼 숨김) */}
            <div className="h-14 flex justify-between">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-14 w-44 rounded-full" />
                <div className="size-14 shrink-0" />
            </div>
            {/* 방향 토글: 버튼 h-10 + 안쪽 여백 p-1 + 테두리 2px = 52px(h-13) */}
            <div className="mt-3 flex justify-center">
                <Skeleton className="h-13 w-44 rounded-full" />
            </div>
            <div className="flex flex-col flex-1 items-center mt-4">
                {/* 판정 카드와 같은 높이: 제목 text-6xl(60px) + mb-4 + 문구 text-lg(28px) */}
                <Skeleton className="mb-4 h-15 w-56" />
                <Skeleton className="h-7 w-48" />
                {/* 「도보 N분 기준 · 수정」 줄 */}
                <div className="mt-2 flex h-9 items-center">
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>
            {/* 도착 목록 */}
            <div className="mx-4 mb-6 flex flex-col gap-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-12" />
                <Skeleton className="h-8" />
            </div>
        </div>
    )
}
