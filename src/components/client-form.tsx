"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clientSchema,
  clientStatuses,
  type ClientInput,
} from "@/lib/validation";
import { saveClientAction } from "@/app/actions";
import { Button } from "./ui/button";
const empty: ClientInput = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  website: "",
  organizationNumber: "",
  address: "",
  status: "LEAD",
  tags: "",
  summary: "",
};
export function ClientForm({
  initial,
  id,
}: {
  initial?: ClientInput;
  id?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial ?? empty,
  });
  return (
    <form
      className="panel max-w-4xl p-6 sm:p-8"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        const result = await saveClientAction(values, id);
        if (result.error) setError(result.error);
        else {
          router.push(`/clients/${result.id}`);
          router.refresh();
        }
      })}
    >
      <h2 className="text-lg font-semibold">Company details</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-7">
        Keep the information your agency needs in one place.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {(
          [
            ["companyName", "Company name", "text"],
            ["contactPerson", "Contact person", "text"],
            ["email", "Email address", "email"],
            ["phone", "Phone number", "tel"],
            ["website", "Website URL", "url"],
            ["organizationNumber", "Organization number", "text"],
            ["address", "Address", "text"],
            ["tags", "Tags (comma separated)", "text"],
          ] as const
        ).map(([field, label, type]) => (
          <label key={field} className="field">
            {label}
            <input
              type={type}
              {...register(field)}
              aria-invalid={!!errors[field]}
            />
            {errors[field] && (
              <span className="error">{errors[field]?.message}</span>
            )}
          </label>
        ))}
        <label className="field">
          Status
          <select {...register("status")}>
            {clientStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="field sm:col-span-2">
          Client overview
          <textarea rows={4} {...register("summary")} />
          {errors.summary && (
            <span className="error">{errors.summary.message}</span>
          )}
        </label>
      </div>
      {error && (
        <p role="alert" className="error mt-4">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 mt-7 pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(id ? `/clients/${id}` : "/clients")}
        >
          Cancel
        </Button>
        <Button disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : id ? "Save changes" : "Create client"}
        </Button>
      </div>
    </form>
  );
}
