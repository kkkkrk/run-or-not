// src/lib/nearby.ts
import type { NearbyStations } from "@/types/ui";
import type { GeoState } from "@/lib/geo-state";
import { findNearbyStation, NEARBY_RADIUS_M } from "@/lib/stations";
import { getLineColor } from "@/lib/line-color";

export function toNearby(geo: GeoState): NearbyStations {
    switch (geo.status) {
        case "unknown": // 권한 답을 기다리는 수십 ms — 줄이 생겼다 사라지지 않게 「내 위치로 찾기」 줄을 그대로 둔다
        case "idle":
            return  {status: "idle"};
        case "locating":
            return  {status: "locating"};
        case "ok": {
            const nearStations = findNearbyStation(geo.lat, geo.lng);

            if(nearStations.length){
                return {status:"list", rows: nearStations.map((station)=>({
                        stationId: station.station.id,
                        stationName: station.station.name,
                        lineName: station.station.lineName,
                        lineColor: getLineColor(station.station.lineName),
                        distanceM: station.distanceM,
                    }
                ))}
            }
            else{
                return {status: "none", radiusM: NEARBY_RADIUS_M};
            }
        }
        case "denied":
            return  {status: "denied"};
        case "timeout":
        case "unavailable":
            return  {status: "failed"};
        case "unsupported":
            return {status: "unsupported"}
        default:
            return {status: "failed"}
    }
}