"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const CheckBoxComp = React.forwardRef(
  ({ intermediate, className, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolveRef = ref || defaultRef;

    React.useEffect(() => {
      resolveRef.current.intermediate = intermediate;
    }, [resolveRef, intermediate]);
    return (
      <input
        type="checkbox"
        ref={resolveRef}
        className={cn(
          "h-4 w-4 cursor-pointer rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        {...rest}
      />
    );
  }
);

CheckBoxComp.displayName = "CheckBoxComp";
