"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

// Next.js App Router error boundary. The project previously shipped a
// Pages-Router-era `_error.js` with `getInitialProps`, which the App Router
// never invokes, so an unhandled render error had no styled fallback at all.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred while loading this page. You can try again, or head back home.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/")}>Go home</Button>
      </div>
    </main>
  );
}
