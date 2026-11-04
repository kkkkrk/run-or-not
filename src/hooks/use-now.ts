import { useEffect, useState } from "react";

export function useNow(){
    const [now, setNow] = useState<null|number>(null);

    useEffect(()=>{
        setTimeout(()=>{
            setNow(0);
        },0)
        const timer = setInterval(()=>{
            setNow(((prev) => (prev ?? 0) + 1));
        },1000)
        return () =>  clearInterval(timer);
    },[]);

    return now;
}