import { Button } from "@/components/ui/button"
import { ChevronRight ,Settings } from "lucide-react"
import { getLineColor } from "@/lib/line-color";
export function StationHeader({
    stationName, 
    lineName
}:{
    stationName: string;
    lineName:string;
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
                        <span className="text-slate-500">석남방면</span>
                    </p>
                </div>
                <Button variant="outline" size="icon" className="
                h-14 w-14 rounded-full border-2 bg-white text-slate-900 hover:bg-slate-100
                "><Settings className="size-5"/></Button>
            </nav>
    )
}