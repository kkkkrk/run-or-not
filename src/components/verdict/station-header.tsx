import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { getLineColor } from "@/lib/line-color";
import { getDirectionLabel } from "@/components/station/direction-toggle";
import type { Direction } from "@/types/subway";
export function StationHeader({
    stationName,
    lineName,
    subwayId,
    dir,
}:{
    stationName: string;
    lineName:string;
    subwayId: string;
    dir: Direction;
}) {
    const lineColor = getLineColor(lineName)
    return (
        <nav className="h-14 flex justify-between">
                <Button variant="outline" size="icon" className="
                h-14 w-14 rounded-full border-2 bg-white text-slate-900 hover:bg-slate-100 rotate-180
                "><ChevronRight className="size-6"/></Button>
                <div className="flex item-center justify-center gap-3 bg-white border-[3px] border-gray-200 rounded-full px-5 py-2.5 w-fit">
                    <span 
                        className="flex items-center justify-center h-8 w-8 rounded-full text-lg font-bold text-white"
                        style={{backgroundColor: lineColor}}
                    >
                        {lineName[0]}
                    </span>
                    <p className="flex items-baseline gap-2">
                        <strong className="text-xl text-slate-800">{stationName}</strong>
                        <span className="text-slate-500">{getDirectionLabel(subwayId, dir)}</span>
                    </p>
                </div>
                {/* 설정 버튼 자리. 설정 화면은 MVP 밖이라 숨기고, 역 이름이 가운데에 오도록 뒤로 버튼과 같은 크기의 빈 칸을 둔다 */}
                <div className="h-14 w-14 shrink-0" />
            </nav>
    )
}