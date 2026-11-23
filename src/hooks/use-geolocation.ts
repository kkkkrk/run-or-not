import { nextGeo, type GeoState } from "@/lib/geo-state"
import { useCallback, useEffect, useReducer, useState, useSyncExternalStore } from "react";

const LIMIT_MS = 10_000; // 허용 뒤부터 10초 - 브라우저가 센다
const PROMPT_LIMIT_MS = 60_000; // 권한 창에 답이 없을 때 멈추는 안전장치 - 요청부터 센다

//지원 여부는 바뀌지 않으므로 구독할 것이 없다
const subscribeNoop = () => () => {};
const getSupported = () => "geolocation" in navigator && window.isSecureContext;
//서버는 navigator를 모르므로 일단 지원한다고 보고 idle로 그린다.
const getServerSupported = () => true

export function useGeolocation({watch = false}:{watch ?: boolean} = {}){
    const supported = useSyncExternalStore(subscribeNoop, getSupported, getServerSupported);
    const [geo, dispatch] = useReducer(nextGeo, {status: "idle"});
    const [attempt, setAttempt] = useState(0);

    const request = useCallback(() => {
        dispatch({type: "request"});
        setAttempt((n) => n+1)
    }, [])

    // 열 때: 이미 허용했나? (권한 창은 띄우지 않는다)
    useEffect(()=> {
        if(!supported || !("permissions" in navigator)) return;
        let alive = true;
        navigator.permissions
            .query({name: "geolocation"})
            .then((p)=>{
                if(!alive) return;
                if(p.state === "granted") request();
                else dispatch({type: "permission", state: p.state});
            })
            .catch((err)=>{
                console.error("위치 권한 확인 실패 ", err);
            });
        return () => {
            alive = false;
        }
    }, [supported, request]);

    useEffect(()=>{
        if(!supported || attempt === 0) return;
        let stopped = false; // 이번 시도가 끝났나
        let gotFirst = false; // 첫 위치를 받았나
        let watchId: number | null = null // 감시 번호

        /** 이번 시도를 끝낼 때 부르는 함수 */
        const stop = () => { 
            stopped = true;
            clearTimeout(safety);
            if(watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
        /** 권한 창이 떠 있는 동안 브라우저 timeout은 돌지 않는다 --> 답이 끝내 없을 때만 대비 */
        const safety = setTimeout(() => {
            dispatch({type: "limit"});
            stop();
        }, PROMPT_LIMIT_MS);

        /** 위치가 왔을 때 브라우저가 부르는 함수 */
        const onOk = (pos: GeolocationPosition) => {
            if(stopped) return;
            gotFirst = true;
            clearTimeout(safety);
            const { latitude, longitude, accuracy} = pos.coords;
            dispatch({ type: "position", lat: latitude, lng: longitude, accuracy});
            if(!watch) stop();
        }
        const onErr = (err: GeolocationPositionError) => {
            if(stopped) return;
            dispatch({ type: "error", code: err.code});
            if(!gotFirst || err.code === err.PERMISSION_DENIED) stop();
        }

        const options: PositionOptions = { enableHighAccuracy: true, timeout: LIMIT_MS, maximumAge: 5_000};
        if(watch) watchId = navigator.geolocation.watchPosition(onOk, onErr, options); //위치가 바뀔 때마다 onOk를 부름
        else navigator.geolocation.getCurrentPosition(onOk, onErr, options); // onOk를 한번만 부르고 끝남
        return stop;
    }, [supported, attempt, watch]);

    const state: GeoState = supported ? geo : {status: "unsupported"};
    return {state, request};
}