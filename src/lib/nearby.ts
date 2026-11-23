// src/lib/nearby.ts
import type { NearbyStationRow, NearbyStations } from "@/types/ui";
import type { GeoState } from "@/lib/geo-state";
import { findNearbyStation } from "@/lib/stations";
import { getLineColor } from "@/lib/line-color";

export const NEARBY_RADIUS_M = 2000;

export function toNearby(geo: GeoState): NearbyStations {
    switch (geo.status) {
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