import { nextGeo, type GeoState } from "@/lib/geo-state"
import { useCallback, useEffect, useReducer, useState, useSyncExternalStore } from "react";

const LIMIT_MS = 10_000; // 허용 뒤부터 10초 - 브라우저가 센다
const PROMPT_LIMIT_MS = 60_000; // 권한 창에 답이 없을 때 멈추는 안전장치 - 요청부터 센다
const PERMISSION_WAIT_MS = 1_000; // 「이미 허용했나?」의 답을 기다리는 시간 - 넘으면 「안 물어봄」으로 본다

//지원 여부는 바뀌지 않으므로 구독할 것이 없다
const subscribeNoop = () => () => {};
const getSupported = () => "geolocation" in navigator && window.isSecureContext;
//서버는 navigator를 모르므로 일단 지원한다고 본다 (역 찾기는 「내 위치로 찾기」 줄, 역 화면은 로딩으로 그린다)
const getServerSupported = () => true
// 권한을 미리 물어볼 수 있는 브라우저인가 - 없으면 기다릴 답이 없다
const getCanAsk = () => "permissions" in navigator;
const getServerCanAsk = () => true;

// 매번 새 객체를 만들지 않게 밖에 둔다 (같은 객체여야 「안 바뀜」으로 본다)
const UNSUPPORTED: GeoState = {status: "unsupported"};
const IDLE: GeoState = {status: "idle"};

type Options = {
    watch?: boolean;       // true면 한 번 받고 끝내지 않고 계속 따라간다
    minMoveM?: number;     // 따라갈 때 - 마지막으로 알린 곳에서 이 거리(m)를 넘게 움직여야 새 위치를 알린다 (작은 움직임은 GPS 흔들림일 수 있다)
    anchorMoveM?: number;  // 따라갈 때 - 기준점(state.anchor)에서 이 거리(m)를 넘게 움직이면 기준점을 지금 자리로 옮긴다
};

export function useGeolocation({watch = false, minMoveM, anchorMoveM}: Options = {}){
    const supported = useSyncExternalStore(subscribeNoop, getSupported, getServerSupported);
    const canAsk = useSyncExternalStore(subscribeNoop, getCanAsk, getServerCanAsk);
    const [geo, dispatch] = useReducer(nextGeo, {status: "unknown"});
    // 이번 시도. id가 바뀌면 새 시도를 시작하고, on이 false면 하던 시도를 그만둔다
    const [run, setRun] = useState({id: 0, on: false});

    const request = useCallback(() => {
        dispatch({type: "request"});
        setRun((r) => ({id: r.id + 1, on: true}));
    }, [])

    /** 그만 - 위치를 더 따라가지 않는다. 확인 중이었으면 그만두고, 실패 안내도 치운다 */
    const stop = useCallback(() => {
        dispatch({type: "stop"});
        setRun((r) => (r.on ? {...r, on: false} : r));
    }, [])

    // 열 때: 이미 허용했나? (권한 창은 띄우지 않는다)
    useEffect(()=> {
        if(!supported || !canAsk) return;
        let done = false; // 답을 이미 썼나 (화면이 사라진 뒤 · 기다리다 포기한 뒤에 온 답은 버린다)
        // 답이 끝내 안 오는 브라우저에서 화면이 로딩에 갇히지 않게
        const giveUp = setTimeout(() => {
            if(done) return;
            done = true;
            dispatch({type: "permission", state: "prompt"});
        }, PERMISSION_WAIT_MS);
        navigator.permissions
            .query({name: "geolocation"})
            .then((p)=>{
                if(done) return;
                done = true;
                clearTimeout(giveUp);
                if(p.state === "granted") request();
                else dispatch({type: "permission", state: p.state});
            })
            .catch((err)=>{
                console.error("위치 권한 확인 실패 ", err);
                if(done) return;
                done = true;
                clearTimeout(giveUp);
                dispatch({type: "permission", state: "prompt"});
            });
        return () => {
            done = true;
            clearTimeout(giveUp);
        }
    }, [supported, canAsk, request]);

    useEffect(()=>{
        if(!supported || !run.on) return;
        let ended = false; // 이번 시도가 끝났나
        let gotFirst = false; // 첫 위치를 받았나
        let watchId: number | null = null // 감시 번호

        /** 이번 시도를 끝낼 때 부르는 함수 */
        const end = () => {
            ended = true;
            clearTimeout(safety);
            if(watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
        /** 권한 창이 떠 있는 동안 브라우저 timeout은 돌지 않는다 --> 답이 끝내 없을 때만 대비 */
        const safety = setTimeout(() => {
            dispatch({type: "limit"});
            end();
        }, PROMPT_LIMIT_MS);

        /** 위치가 왔을 때 브라우저가 부르는 함수 */
        const onOk = (pos: GeolocationPosition) => {
            if(ended) return;
            gotFirst = true;
            clearTimeout(safety);
            const { latitude, longitude, accuracy} = pos.coords;
            // 받아들일지 · 기준점을 옮길지는 규칙표(nextGeo)가 정한다. 훅은 온 위치를 그대로 넘기기만 한다
            dispatch({ type: "position", lat: latitude, lng: longitude, accuracy, minMoveM, anchorMoveM});
            if(!watch) end();
        }
        const onErr = (err: GeolocationPositionError) => {
            if(ended) return;
            dispatch({ type: "error", code: err.code});
            if(!gotFirst || err.code === err.PERMISSION_DENIED) end();
        }

        const options: PositionOptions = { enableHighAccuracy: true, timeout: LIMIT_MS, maximumAge: 5_000};
        if(watch) watchId = navigator.geolocation.watchPosition(onOk, onErr, options); //위치가 바뀔 때마다 onOk를 부름
        else navigator.geolocation.getCurrentPosition(onOk, onErr, options); // onOk를 한번만 부르고 끝남
        return end;
    }, [supported, run, watch, minMoveM, anchorMoveM]);

    // 미지원이면 다른 건 볼 것도 없다. 권한을 미리 물어볼 수 없는 브라우저는 기다릴 답이 없으니 바로 idle
    const state: GeoState = !supported ? UNSUPPORTED : geo.status === "unknown" && !canAsk ? IDLE : geo;
    return {state, request, stop};
}
