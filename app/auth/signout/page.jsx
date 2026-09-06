"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await authClient.signOut();
        toast.success("Signed out successfully");
        router.push("/");
      } catch (error) {
        console.error("Sign out error:", error);
        toast.error("Failed to sign out");
        router.push("/");
      }
    };

    performSignOut();
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  );
}
