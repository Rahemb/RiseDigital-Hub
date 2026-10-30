"use client";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
export function LeadSelection({ children }: { children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      action="/leads/websites"
      method="get"
      onSubmit={(e) => {
        if (!new FormData(e.currentTarget).getAll("ids").length) {
          e.preventDefault();
          alert("Select at least one company first.");
        }
      }}
    >
      <details className="mb-3 text-sm">
        <summary className="text-muted-foreground">
          Advanced selection tools
        </summary>
        <div className="flex flex-wrap gap-3 mt-3">
          <Button type="submit" variant="outline">
            Advanced: find websites for selected leads
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              const inputs = Array.from(
                form.current?.querySelectorAll<HTMLInputElement>(
                  'input[name="ids"]',
                ) ?? [],
              );
              const checked = !inputs.every((i) => i.checked);
              for (const input of inputs) input.checked = checked;
            }}
          >
            Select / clear all on this page
          </Button>
        </div>
      </details>
      {children}
    </form>
  );
}
