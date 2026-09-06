"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import UserButton from "./UserButton";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import CountdownTimer from "./common/CountdownTimer";
import { APPLICATION_DEADLINE } from "@/constants";

const NavBar = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  const navItems = useMemo(() => {
    const items = [{ label: "Departments", href: "/departments" }];
    if (isAdmin) items.push({ label: "Admin", href: "/admin" });
    return items;
  }, [isAdmin]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            aria-hidden="true"
          >
            R
          </span>
          <span className="font-heading">Recruitment Portal</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground lg:flex">
          <span>Applications close in</span>
          <CountdownTimer targetDate={APPLICATION_DEADLINE} compact />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : !isAuthenticated ? (
            <Button size="sm" onClick={() => router.push("/auth/signin")} className="cursor-pointer">
              Sign in
            </Button>
          ) : (
            <UserButton user={user} isAdmin={isAdmin} />
          )}
        </div>
      </nav>
    </header>
  );
};

export default NavBar;
