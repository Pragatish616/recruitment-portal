"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

// WebGL (via ogl) touches the canvas/GPU directly and has nothing useful to
// render on the server, so it's loaded client-only and code-split out of
// the initial page bundle instead of shipping on every visit.
const Iridescence = dynamic(() => import("@/components/ui/Iridescence/Iridescence"), {
  ssr: false,
});

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden">
      {!reduceMotion && (
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen dark:opacity-30">
          <Iridescence color={[0.06, 0.73, 0.51]} speed={0.6} amplitude={0.08} mouseReact={false} />
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6">
        <motion.div
          variants={reduceMotion ? undefined : container}
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          className="max-w-2xl"
        >
          <motion.h1
            variants={reduceMotion ? undefined : item}
            className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"
          >
            Join the team building what&apos;s next.
          </motion.h1>

          <motion.p
            variants={reduceMotion ? undefined : item}
            className="mt-5 max-w-[46ch] text-lg text-muted-foreground"
          >
            Apply to up to two departments and help ship real projects, events, and tools this year.
          </motion.p>

          <motion.div variants={reduceMotion ? undefined : item} className="mt-8">
            <Link
              href="/departments"
              className="group inline-flex h-12 cursor-pointer items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Explore departments
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
