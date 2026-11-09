import { useEffect, useState, useSyncExternalStore } from "react";

type GeoState = { status: 'loading'}
    | {status: 'ok'; lat: number; lng: number, accuracy: number}
    | {status: 'denied' | 'unavailable' | 'timeout' | 'unsupported'}

// 지원 여부는 바뀌지 않으므로 구독할 것이 없다.
const subscribeNoop = () => () => {};
const getSupported = () => "geolocation" in navigator && window.isSecureContext;
// 서버는 navigator를 모르므로 일단 지원한다고 보고 'loading'으로 그린다.
const getServerSupported = () => true;

export function useGeolocation(): GeoState{
    const supported = useSyncExternalStore(subscribeNoop, getSupported, getServerSupported);
    const [geo, setGeo] = useState<GeoState>({status: 'loading'});
    useEffect(() => {
        if(!supported){
            return;
        }
        const watchId = navigator.geolocation.watchPosition((pos) => {
                const {latitude, longitude, accuracy} = pos.coords;
                setGeo({status: "ok", lat: latitude, lng: longitude, accuracy: accuracy});
            },
            (err) => {
                if(err.code === err.PERMISSION_DENIED){
                    setGeo({status: 'denied'});
                }
                if(geo.status === "loading"){
                    if(err.code === err.TIMEOUT){
                        setGeo({status: 'timeout'});
                    } else if(err.code === err.POSITION_UNAVAILABLE){
                        setGeo({status: 'unavailable'});
                    }
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        )
        return () => navigator.geolocation.clearWatch(watchId);
    }, [supported, geo.status])

    if(!supported){
        return {status: 'unavailable'};
    }
    return geo;
}
