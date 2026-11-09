'use client'
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/Button"

// 렌더 중 예상 못 한 에러 전용. API 실패는 StationView가 화면 안에서 처리하고 throw하지 않는다.
// Next 16.3부터 안정화된 retry를 받는다 (unstable_retry는 16.2 이름이라 16.3.6은 넘기지 않음)
export default function Error({
    error, retry
}: {
    error: Error & { digest?: string },
    retry: ()=>void
}){
    useEffect(()=>{
        console.error(error);
    },[error])
    return (
        <div>
            <h3>오류가 발생했습니다.</h3>
            <Button onClick={() => retry()}>다시 시도</Button>
            <Button><Link href="/">다른 역 찾기</Link></Button>
        </div>
    )
}