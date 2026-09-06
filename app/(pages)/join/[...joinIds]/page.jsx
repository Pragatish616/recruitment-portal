"use client";

import React, { useState } from "react";
import { useRouter, notFound } from "next/navigation";
import { reviews } from "@/constants/index";

import NavBar from "@/components/NavBar";
import FormComp from "@/components/FormComp";
import Footer from "@/components/Footer";
import RecruitmentLoader from "@/components/GDGLoader";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const JoinDepartmentPage = ({ params }) => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <NavBar />
        <RecruitmentLoader />
        <Footer />
      </main>
    );
  }

  const ids = params.joinIds;
  const valid = ids.every((id) => reviews.some((dept) => dept.id === id));
  if (!valid) notFound();

  const departments = reviews.filter((dept) => ids.includes(dept.id));
  const user = session?.user;
  const isSignedIn = !!user;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <NavBar />
      {isSignedIn ? (
        <FormComp
          dept1={departments[0]}
          dept2={departments[1]}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      ) : (
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to access the application form.
          </p>
          <Button onClick={() => router.push("/auth/signin")}>Sign in</Button>
        </div>
      )}
      <Footer />
    </main>
  );
};

export default JoinDepartmentPage;
