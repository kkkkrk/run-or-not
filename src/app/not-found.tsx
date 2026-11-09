import Link from "next/link";

export default function NotFound(){
    return(
        <div className="text-center text-lg mt-3">
            <p>잘못된 경로에요</p>
            <Link href="/" className="mt-2 inline-block underline">
                메인으로 가기
            </Link>
        </div>
    )
}
