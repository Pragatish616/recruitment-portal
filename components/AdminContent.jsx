"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";
import DataTable from "./DataTable";

// The server (app/(pages)/admin/page.jsx) already refuses to fetch or send
// applicant data unless the request carries an admin session, so `applicants`
// is guaranteed empty here for anyone unauthorized. This component only
// owns the presentation of that state, not the access decision.
const AdminContent = ({ applicants, isAuthorized, hasSession }) => {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 px-2 pt-1">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-start gap-3 p-1">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="rounded-md border border-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-3 last:border-b-0">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40 hidden sm:block" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-24 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Authentication required</h1>
        <p className="text-muted-foreground">Sign in with an admin account to view the recruitment dashboard.</p>
        <Button onClick={() => router.push("/auth/signin")}>Sign in</Button>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-muted-foreground">You are not authorized to view this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Applicants</h1>
      <DataTable data={applicants} />
    </div>
  );
};

export default AdminContent;
