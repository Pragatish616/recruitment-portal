"use client";
import React, { useMemo, useState } from "react";
import * as z from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ArrowRight, Loader2 } from "lucide-react";
import { QuestionnaireData, JOIN_QUESTION } from "@/constants";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { cn } from "@/lib/utils";

const normaliseQuestion = (question) =>
  typeof question === "string"
    ? { name: question, type: "generic", placeholder: "2-3 sentences" }
    : question;

const normalizeDeptName = (str) =>
  str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

function FieldShell({ label, description, error, children }) {
  return (
    <FormItem className="space-y-2">
      <FormLabel className="text-sm font-medium text-foreground">{label}</FormLabel>
      <FormControl>{children}</FormControl>
      {description && !error && (
        <FormDescription className="text-xs">{description}</FormDescription>
      )}
      <FormMessage />
    </FormItem>
  );
}

const FormComp = ({ dept1, dept2, isLoading, setIsLoading }) => {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const isLoaded = !isPending;

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { submittedDepartments: contextSubmitted, markDepartmentsSubmitted } = useSubmissions();
  const [submittedDepartments, setSubmittedDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDraftReady, setIsDraftReady] = useState(false);

  const departments = useMemo(() => [dept1, dept2].filter(Boolean), [dept1, dept2]);
  const departmentNames = useMemo(
    () => departments.map((department) => (typeof department === "string" ? department : department.name)),
    [departments]
  );
  const draftKey = user?.email && departmentNames.length
    ? `recruitment-draft:${user.email}:${[...departmentNames].sort().join("|")}`
    : null;

  const questionData = useMemo(
    () => [...new Set(departmentNames.flatMap((department) =>
      (QuestionnaireData.find((item) => normalizeDeptName(item.department) === normalizeDeptName(department))?.questions ?? [])
        .map(normaliseQuestion)
        .map((question) => question.name)
    ))],
    [departmentNames]
  );

  const schemaObj = {
    Name: z.string().min(1, "Name is required"),
    RegistrationNumber: z
      .string()
      .min(1, "Registration number is required")
      .regex(
        /^\d{2}[A-Z]{3}\d{4}$/,
        "Format: 2 digits, 3 letters, 4 digits (e.g. 25BCE5612)"
      ),
    Email: z.string(),
    Phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
    Gender: z.string().optional(),
    "Year of Study": z.string().optional(),
    [JOIN_QUESTION]: z.string().min(1, "This field is required"),
  };

  questionData.forEach((qd) => {
    // Guard against a department's own QuestionnaireData happening to reuse
    // the exact JOIN_QUESTION string (it does for some departments, which is
    // why DepartmentQuestions filters it out of the per-department render
    // below): without this check, this loop would silently downgrade that
    // field back to optional.
    if (qd === JOIN_QUESTION) return;
    schemaObj[qd] = z.string().optional();
  });

  const formSchema = z.object(schemaObj);
  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      Name: "",
      RegistrationNumber: "",
      Email: "",
      Phone: "",
      Gender: "",
      "Year of Study": "",
      [JOIN_QUESTION]: "",
    },
  });

  React.useEffect(() => {
    if (!isLoaded || !user || !draftKey) return;

    const email = user.email;
    let isActive = true;
    setIsDraftReady(false);
    setLoading(true);

    try {
      const savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      form.reset({ ...form.getValues(), ...savedDraft.values, Email: email });
    } catch {
      form.setValue("Email", email);
    }

    async function initialiseForm() {
      const savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      let remoteSubmitted = contextSubmitted || [];

      if (!remoteSubmitted.length) {
        const cacheKey = `submitted_depts_${email}`;
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

        if (cached) {
          try {
            remoteSubmitted = JSON.parse(cached);
          } catch {}
        } else {
          try {
            const response = await fetch(`/api/check-applications?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (result?.submittedDepartments) {
              remoteSubmitted = result.submittedDepartments;
              if (typeof window !== "undefined") {
                sessionStorage.setItem(cacheKey, JSON.stringify(remoteSubmitted));
              }
            }
          } catch (err) {
            console.error("Failed to check applications:", err);
          }
        }
      }

      if (!isActive) return;
      const completed = [...new Set([...(savedDraft.submittedDepartments || []), ...remoteSubmitted])];
      setSubmittedDepartments(completed);
      if (departmentNames.length > 0 && departmentNames.every((dept) => completed.includes(dept))) {
        setErrorMessage(`You have already submitted an application for ${departmentNames.join(" and ")}.`);
      }
      localStorage.setItem(draftKey, JSON.stringify({ values: form.getValues(), submittedDepartments: completed }));
      setLoading(false);
      setIsDraftReady(true);
    }

    initialiseForm().catch(() => {
      if (isActive) {
        setLoading(false);
        setIsDraftReady(true);
      }
    });

    return () => { isActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSubmitted, departmentNames.join("|"), draftKey, isLoaded, user]);

  const watchedValues = useWatch({ control: form.control });

  React.useEffect(() => {
    if (!isDraftReady || !draftKey) return;
    // useWatch fires on every keystroke across every field, including the
    // long free-text answers; writing to localStorage (synchronous,
    // JSON.stringify'd) on each one causes visible typing jank. Debounce so a
    // burst of keystrokes collapses into one write after the user pauses.
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ values: watchedValues, submittedDepartments }));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [draftKey, isDraftReady, submittedDepartments, watchedValues]);

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Preparing your application...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in required</h1>
        <p className="text-muted-foreground">
          Please sign in to access the application form.
        </p>
        <Button onClick={() => router.push("/auth/signin")}>Sign in</Button>
      </div>
    );
  }

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const pendingDepartments = departmentNames.filter((department) => !submittedDepartments.includes(department));

    if (!pendingDepartments.length) {
      toast.success("Your applications have already been submitted.");
      setIsSubmitting(false);
      router.push("/departments");
      return;
    }

    const basicDetails = {
      Name: values.Name,
      RegistrationNumber: values.RegistrationNumber,
      Email: values.Email,
      Phone: values.Phone,
      Gender: values.Gender,
      "Year of Study": values["Year of Study"],
    };

    const submitDepartment = async (department) => {
      const questions = (QuestionnaireData.find((item) => item.department === department)?.questions ?? [])
        .map(normaliseQuestion);

      // The "why do you want to join" answer is asked once, above the
      // per-department questions, but must still land in every submitted
      // application: each department gets its own Firestore document, and
      // that document's Questions map is the only place answers are stored.
      const departmentAnswers = questions.reduce(
        (answers, question) => ({ ...answers, [question.name]: values[question.name] || "" }),
        { [JOIN_QUESTION]: values[JOIN_QUESTION] || "" }
      );

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basicDetails,
          Department: department,
          Questions: departmentAnswers,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Could not submit ${department}.`);
      }
      return { department, success: true };
    };

    try {
      const results = await Promise.allSettled(pendingDepartments.map(submitDepartment));
      const successful = results
        .filter((result) => result.status === "fulfilled" && result.value.success)
        .map((result) => result.value.department);
      const failed = results.flatMap((result, index) =>
        result.status === "rejected" ? [pendingDepartments[index]] : []
      );
      const completed = [...new Set([...submittedDepartments, ...successful])];

      setSubmittedDepartments(completed);
      markDepartmentsSubmitted(completed);
      if (draftKey) localStorage.setItem(draftKey, JSON.stringify({ values, submittedDepartments: completed }));
      if (typeof window !== "undefined" && values?.Email) {
        sessionStorage.setItem(`submitted_depts_${values.Email}`, JSON.stringify(completed));
      }
      successful.forEach((department) => toast.success(`Application submitted for ${department}.`));

      if (failed.length) {
        setErrorMessage(`Submitted ${successful.length ? successful.join(", ") : "no applications"}. Please retry ${failed.join(", ")}.`);
      } else {
        router.push("/departments");
      }
    } catch {
      setErrorMessage("Your applications could not be submitted. Your saved answers will be kept for retrying.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-10 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Application form</h1>
        <p className="text-muted-foreground">
          You are applying to{" "}
          <span className="font-medium text-foreground">{departmentNames.join(" and ")}</span>.
          Answers save automatically as you type.
        </p>
      </header>

      {errorMessage && !isSubmitting && (
        <div
          role="alert"
          className="mb-8 flex items-start justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push("/departments")}
            className="shrink-0 cursor-pointer font-medium underline underline-offset-2"
          >
            Go back
          </button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-10">
          <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">About you</h2>
              <p className="text-sm text-muted-foreground">Basic details used across both departments.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="Name"
                render={({ field, fieldState }) => (
                  <FieldShell label="Full name" error={fieldState.error}>
                    <Input {...field} placeholder="Jane Doe" />
                  </FieldShell>
                )}
              />

              <FormField
                control={form.control}
                name="RegistrationNumber"
                render={({ field, fieldState }) => (
                  <FieldShell label="Registration number" error={fieldState.error}>
                    {/* The visible "uppercase" class only styles the text — it doesn't
                        change the actual value, so typing lowercase looked correct on
                        screen but still failed the uppercase-only format regex below. */}
                    <Input
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      placeholder="25BCE5612"
                      className="uppercase"
                    />
                  </FieldShell>
                )}
              />

              <FormField
                control={form.control}
                name="Gender"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">Gender</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Email"
                render={({ field, fieldState }) => (
                  <FieldShell label="Email address" error={fieldState.error}>
                    <Input {...field} readOnly type="email" className="cursor-not-allowed opacity-70" />
                  </FieldShell>
                )}
              />

              <FormField
                control={form.control}
                name="Phone"
                render={({ field, fieldState }) => (
                  <FieldShell label="Phone (WhatsApp)" error={fieldState.error}>
                    <Input {...field} placeholder="9876543210" inputMode="numeric" />
                  </FieldShell>
                )}
              />

              <FormField
                control={form.control}
                name="Year of Study"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">Year of study</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={JOIN_QUESTION}
              render={({ field, fieldState }) => (
                <FieldShell label={JOIN_QUESTION} error={fieldState.error}>
                  <Textarea {...field} rows={4} placeholder="2-3 sentences" />
                </FieldShell>
              )}
            />
          </section>

          {departments.map((department, index) => (
            <DepartmentQuestions
              key={department.name || index}
              department={department}
              form={form}
            />
          ))}

          <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full gap-2 sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit application
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

const DepartmentQuestions = ({ department, form }) => {
  const departmentName = typeof department === "string" ? department : department.name;
  const tone = typeof department === "object" ? department.tone : undefined;

  const questions = (
    QuestionnaireData.find((qd) => qd.department === departmentName)?.questions ?? []
  )
    .map(normaliseQuestion)
    .filter((question) => question.name !== JOIN_QUESTION && question.name !== "Why do you want to join DWASFW?");

  if (!questions.length) return null;

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: tone || "hsl(var(--primary))" }}
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold">{departmentName}</h2>
          <p className="text-sm text-muted-foreground">Questions specific to this department.</p>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question) => {
          const isCompact = question.type === "short-text";

          return (
            <FormField
              key={question.name}
              control={form.control}
              name={question.name}
              render={({ field, fieldState }) => (
                <FieldShell label={question.name} error={fieldState.error}>
                  {isCompact ? (
                    <Input {...field} placeholder={question.placeholder || "Answer..."} />
                  ) : (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={question.placeholder || "2-3 sentences"}
                      className={cn("resize-y")}
                    />
                  )}
                </FieldShell>
              )}
            />
          );
        })}
      </div>
    </section>
  );
};

export default FormComp;
