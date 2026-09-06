import React from "react";
import { Loader2 } from "lucide-react";

const RecruitmentLoader = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
};

export default RecruitmentLoader;
