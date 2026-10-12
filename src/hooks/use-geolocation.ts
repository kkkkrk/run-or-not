import { useEffect, useState } from "react";

type GeoState = { status: 'loading'} 
    | {status: 'ok'; lat: number; lng: number, accuracy: number}
    | {status: 'denied' | 'unavailable' | 'timeout' | 'unsupported'} 

const toStatus = (err: GeolocationPositionError): 'denied'|'timeout'| 'unavailable'=> {
    switch(err.code){
        case err.PERMISSION_DENIED:
            return 'denied';
        case err.TIMEOUT:
            return 'timeout';
        case err.POSITION_UNAVAILABLE:
            return 'unavailable';
        default:
            return 'unavailable';
    }
    
}
export function useGeolocation(): GeoState{ 
    const [geo, setGeo] = useState<GeoState>({status: 'loading'});
    useEffect(() => {
        if(!("geolocation" in navigator) || !window.isSecureContext){
            setGeo({status: 'unavailable'})
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
    }, [geo.status])
    
    return geo;
} 