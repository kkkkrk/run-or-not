import { Button } from "@/components/ui/button"
import { ChevronRight, ArrowRightLeft ,Settings } from "lucide-react"
import Runner from "@/app/Runner"

export default function Station(){
    return(
        <div className="min-h-screen flex flex-col justify-between ">
            <nav className="h-14 flex justify-between">
                <Button variant="outline" size="icon" className="
                h-14 w-14 rounded-full border-2 bg-white text-slate-900 hover:bg-slate-100 rotate-180
                "><ChevronRight className="size-6"/></Button>
                <div className="flex item-center justify-center gap-3 bg-white border-[3px] border-gray-200 rounded-full px-5 py-2.5 w-fit">
                    <span className="flex items-center justify-center h-8 w-8 bg-[#64792C] rounded-full text-lg font-bold text-white">
                        7
                    </span>
                    <p className="flex items-baseline gap-2">
                        <strong className="text-xl text-slate-800">건대입구</strong>
                        <span className="text-slate-500">석남방면</span>
                    </p>
                </div>
                <Button variant="outline" size="icon" className="
                h-14 w-14 rounded-full border-2 bg-white text-slate-900 hover:bg-slate-100
                "><Settings className="size-5"/></Button>
            </nav>
            <main className="flex flex-col flex-1 justify-between items-center mt-4">
                <div className="flex flex-col items-center">
                    <h1 className="mb-4 text-6xl font-black text-[#12B76A]">
                        걸어가요
                    </h1>
                    <p className="text-lg font-medium text-slate-600">
                        다음 열차는 걸어가도 4분 10초 남아요
                    </p>
                </div>
                <div className="w-90">
                    <Runner state="rest" color={"#12B76A"} />
                </div>
            </main>
            <div className="h-120 bg-blue-100 "></div>
        </div>
        
    )
}