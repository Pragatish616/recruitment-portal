import { redirect } from "next/navigation";

// This page used to disambiguate "Web Dev" vs "App Dev" behind a single
// "Development" entry point. Both are already independent, fully-working
// picks on /departments (see the `technical` group there), so that split
// step no longer serves a purpose -- it also imported DeptHero with a
// setIsLoading prop that was never passed, which would throw as soon as
// the page rendered. Redirecting keeps any old link or bookmark working
// instead of hitting a crash.
export default function DevelopmentPage() {
  redirect("/departments");
}
