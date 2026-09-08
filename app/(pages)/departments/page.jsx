"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { reviews } from "@/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSubmissions } from "@/components/SubmissionsProvider";

const departments = reviews;
const MAX_SELECTION = 2;
const technicalDepartments = departments.filter((d) => d.category === "technical");
const nonTechnicalDepartments = departments.filter((d) => d.category === "non-technical");

const DepartmentsListPage = () => {
  const router = useRouter();
  const { submittedDepartments, isLoadingSubmissions } = useSubmissions();
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  const remainingSlots = Math.max(0, MAX_SELECTION - submittedDepartments.length);

  const selectedIds = useMemo(
    () =>
      departments
        .filter((dept) => selectedDepartments.includes(dept.name))
        .map((dept) => dept.id),
    [selectedDepartments]
  );

  const toggleDepartment = (departmentName) => {
    if (submittedDepartments.includes(departmentName)) {
      toast.error(`You have already submitted an application for ${departmentName}.`);
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("You have already submitted the maximum allowed (2) applications.");
      return;
    }

    setSelectedDepartments((current) => {
      const isSelected = current.includes(departmentName);
      if (isSelected) return current.filter((name) => name !== departmentName);

      if (current.length >= remainingSlots) {
        toast.error(`You can select at most ${remainingSlots} department(s).`);
        return current;
      }

      return [...current, departmentName];
    });
  };

  const goToApplication = () => {
    if (!selectedIds.length) return;
    router.push(`/join/${selectedIds.join("/")}`);
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <NavBar />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Pick your departments
            </h1>
            <p className="mt-2 text-muted-foreground">
              Select up to two departments to apply to. You can change your selection until you continue.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedDepartments.length} / {MAX_SELECTION} selected
            </span>
            <Button
              onClick={goToApplication}
              disabled={!selectedIds.length}
              className="gap-2"
            >
              Continue to application
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-10">
          <DepartmentGroup
            label="Technical departments"
            departments={technicalDepartments}
            selectedDepartments={selectedDepartments}
            submittedDepartments={submittedDepartments}
            remainingSlots={remainingSlots}
            onToggle={toggleDepartment}
            isLoading={isLoadingSubmissions}
          />
          <DepartmentGroup
            label="Non-technical departments"
            departments={nonTechnicalDepartments}
            selectedDepartments={selectedDepartments}
            submittedDepartments={submittedDepartments}
            remainingSlots={remainingSlots}
            onToggle={toggleDepartment}
            isLoading={isLoadingSubmissions}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
};

const DepartmentGroup = ({
  label,
  departments,
  selectedDepartments,
  submittedDepartments,
  remainingSlots,
  onToggle,
  isLoading,
}) => {
  if (!departments.length) return null;

  // Whether a department is already-submitted/disabled depends on
  // submittedDepartments, which is still in flight on a fresh session (no
  // sessionStorage cache yet — see SubmissionsProvider). Without this,
  // every card would briefly render as "available" and then jump to
  // "Already submitted" a moment later once the check resolves.
  if (isLoading) {
    return (
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <li key={department.id} className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => {
          const Icon = department.icon;
          const isSelected = selectedDepartments.includes(department.name);
          const isSubmitted = submittedDepartments.includes(department.name);
          const disabled = isSubmitted || (!isSelected && remainingSlots <= 0);

          return (
            <li key={department.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(department.name)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex h-full w-full flex-col gap-4 rounded-xl border bg-card p-5 text-left shadow-sm transition-all duration-200",
                  isSelected
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/50 hover:shadow-md",
                  disabled && !isSelected && "cursor-not-allowed opacity-50 hover:border-border hover:shadow-sm",
                  !disabled && "cursor-pointer"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${department.tone}1f`, color: department.tone }}
                    aria-hidden="true"
                  >
                    {Icon ? <Icon width={20} height={20} /> : null}
                  </span>
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                </div>

                <div className="flex-1 space-y-1.5">
                  <h3 className="font-heading font-semibold leading-snug">{department.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {department.description}
                  </p>
                </div>

                {isSubmitted && (
                  <Badge variant="secondary" className="w-fit">
                    Already submitted
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DepartmentsListPage;
