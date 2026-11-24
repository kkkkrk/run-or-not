'use client'
import { StationSearchScreen } from "@/ui/search/station-search-screen";
import { useState } from "react";
import { StationSearchResults, RecentStationRow, BottomNavProps, Direction } from "@/types/ui";
import { useRouter } from "next/navigation";
import { getStation, rightDirSelect, searchStations, stationHref } from "@/lib/stations";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecentStore } from "@/stores/recent-store";
import { getLineColor } from "@/lib/line-color";
import { toNearby } from "@/lib/nearby";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function MainPage() {
  const { state: geo, request } = useGeolocation();
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [activeIndex, setActiveIndex] = useState<null|number>(null);
  const router = useRouter();
  const rawRecentStations = useRecentStore((s) => s.stations)
  let results:StationSearchResults = {status:"none"};
  // const a:NearbyStations?
  if(query.trim() === ""){
    results = {status:"idle"};
  } else {
    let searchResult = searchStations(query);
    if (composing && searchResult.length === 0) {
      searchResult = searchStations(query.slice(0, -1));
    }
    if(searchResult.length){
      const rows = searchResult.map((searchStation)=> {
        return{
          stationId: searchStation.station.id,
          stationName: searchStation.station.name,
          lineName: searchStation.station.lineName,
          lineColor: getLineColor(searchStation.station.lineName),
          matchStart: searchStation.matchStart,
          matchLength: searchStation.matchLength,
        }
      })
      results = {status: "list", rows, activeIndex}
    }
  }
  const recentStations:RecentStationRow[] = rawRecentStations.flatMap((station) => {
    const foundStation = getStation(station.stationId);
    if(foundStation === undefined) return [];

    const directionName = foundStation.next[station.direction];
    if(directionName === null) return [];

    return {
    stationId: station.stationId,
    direction: station.direction,
    stationName: foundStation.name,
    lineName: foundStation.lineName,
    lineColor: getLineColor(foundStation.lineName),
    directionName,
  }});

  const bottomNav:BottomNavProps = {
    active: "search",
    searchHref: "/",
    verdictHref: null,
    settingsHref: "/settings",
  }
  const onEnter = () => {
    if(!composing && results.status === "list"){
      let index = activeIndex
      if(index === null) index = 0;
      const stationId = results.rows[index].stationId;
      const dir = getStation(stationId)?.subwayId;
      if(dir === undefined) return;
      router.push(stationHref(stationId, rightDirSelect(dir)));
    }
  }
  const onSelectStation = (stationId:string) => {
    let dir:undefined|Direction;
    const recent = rawRecentStations.find((s) => s.stationId === stationId);
    if(recent) {
      dir = recent.direction;
    } else{
      const subwayId = getStation(stationId)?.subwayId;
      if(subwayId === undefined) return;
      dir = rightDirSelect(subwayId);
    }
    router.push(stationHref(stationId, dir));
  }
  const onSelectRecent = (stationId:string, direction:Direction) => {
    router.push(stationHref(stationId, direction));
  } 
  const onArrowDown = () => {
    if(results.status !== "list") return;
    if(activeIndex === null) {
      if(results.rows.length >= 1)
      setActiveIndex(0);
    } else if(activeIndex + 2 <= results.rows.length){
      setActiveIndex((prev)=> {
        if(prev === null) return null;
        return prev + 1;
      });
    }
  }
  const onArrowUp = () => {
    if(results.status !== "list") return;
    if(activeIndex === null) return;
    if(activeIndex > 0){
      setActiveIndex((prev)=> {
        if(prev === null) return null;
        return prev -1;
      })
    }
  }


  return (
      <StationSearchScreen 
        query = {query}
        onQueryChange = {(newQuery)=> {setActiveIndex(null); setQuery(newQuery)}}
        onClearQuery = {() => setQuery("")}
        onComposingChange = {(check) => setComposing(check)}
        onArrowDown = {onArrowDown}
        onArrowUp = {onArrowUp}
        onEnter = {onEnter}
        results = {results}
        onSelectStation = {onSelectStation}
        nearby = {toNearby(geo)}
        onFindNearby = {request}
        recent = {hydrated ? recentStations : null}
        onSelectRecent = {onSelectRecent}
        bottomNav = {bottomNav}
      />
  );
}
