'use client'
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/Button"

export default function Error({
    error, unstable_retry
}: {
    error: Error & { digest?: string }, 
    unstable_retry: ()=>void
}){
    useEffect(()=>{
        console.error(error);
    },[error])
    return (
        <div>
            <h3>오류가 발생했습니다.</h3>
            <Button onClick={() => unstable_retry()}>다시 시도</Button>
            <Button><Link href="/">다른 역 찾기</Link></Button>
        </div>
    )
}