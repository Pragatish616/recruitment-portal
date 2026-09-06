"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const getTimeLeft = (target) => {
  const difference = target - Date.now();
  if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    expired: false,
  };
};

const CountdownTimer = ({ targetDate, compact = false, className = "" }) => {
  const target = new Date(targetDate).getTime();
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target));

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(target));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (timeLeft.expired) {
    return <span className={cn("text-sm font-medium text-muted-foreground", className)}>Closed</span>;
  }

  if (compact) {
    return (
      <span className={cn("font-heading font-medium tabular-nums text-foreground", className)}>
        {timeLeft.days}d {String(timeLeft.hours).padStart(2, "0")}h{" "}
        {String(timeLeft.minutes).padStart(2, "0")}m
      </span>
    );
  }

  const TimeUnit = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="font-heading text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <TimeUnit value={timeLeft.days} label="Days" />
      <div className="text-xl font-bold text-muted-foreground/50">:</div>
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <div className="text-xl font-bold text-muted-foreground/50">:</div>
      <TimeUnit value={timeLeft.minutes} label="Minutes" />
      <div className="text-xl font-bold text-muted-foreground/50">:</div>
      <TimeUnit value={timeLeft.seconds} label="Seconds" />
    </div>
  );
};

export default CountdownTimer;
