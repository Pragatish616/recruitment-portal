"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
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
