import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Department not found</h1>
      <p className="max-w-md text-muted-foreground">
        Sorry, the department you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/departments">Browse departments</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
