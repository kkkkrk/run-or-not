import { Button as ShadcnButton } from "@/components/ui/button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof ShadcnButton>;

export function Button({children, ...props}: ButtonProps){
    return(
        <ShadcnButton {...props} variant="outline" className="
                border-2 bg-white text-slate-900 hover:bg-slate-100
        ">
            {children} 
        </ShadcnButton>
    )
}