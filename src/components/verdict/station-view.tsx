'use client'
import Runner from "@/app/Runner"
import { StationHeader } from "./station-header"
import { VerdictCard } from "./verdict-card"
import { ArrivalList } from "./arrival-list"
import { Station } from "@/types/subway"

export function StationView({ 
    station
}:{
    station: Station
}) {
    return(
        <div className="min-h-screen flex flex-col justify-between ">
            <StationHeader stationName = {station.name} lineName={station.lineName}/>
            <main className="flex flex-col flex-1 justify-between items-center mt-4">
                <VerdictCard/>
                <div className="w-90">
                    <Runner state="rest" color={"#10B981"} />
                </div>
            </main>
            <ArrivalList/>
        </div>
    )
}