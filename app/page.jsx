"use client";

import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import { authClient } from "@/lib/auth-client";

const WELCOME_POPUP = {
  header: "Welcome to the recruitment portal",
  description: "Here's what to know before you apply.",
  message: [
    "Sign in with your email to start an application.",
    "You can apply to up to two departments.",
    "Your answers save automatically as you fill out the form.",
  ],
};

const Home = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <NavBar />
      {!isPending && !user && (
        <PopupComp
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          PopupData={WELCOME_POPUP}
        />
      )}
      <Hero />
      <Footer />
    </main>
  );
};

export default Home;
