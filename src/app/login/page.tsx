"use client";
import { useActionState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { login } from "@/app/actions";
import { Button } from "@/components/ui/button";
export default function Login() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <span className="brand-icon">
            <ArrowUpRight />
          </span>
          <span className="text-xl font-semibold">Rise Digital Hub</span>
        </div>
        <div className="panel p-8">
          <p className="eyebrow mb-3">YOUR AGENCY. ORGANIZED.</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm mt-2 mb-7">
            Sign in to your private agency workspace.
          </p>
          <form action={action} className="space-y-5">
            <label className="field">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </label>
            <label className="field">
              Password
              <input
                name="password"
                type="password"
                required
                maxLength={256}
                autoComplete="current-password"
              />
            </label>
            {state.error && (
              <p className="error" role="alert">
                {state.error}
              </p>
            )}
            <Button className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="flex justify-center gap-2 text-xs text-muted-foreground mt-6">
          <ShieldCheck size={15} />
          Local workspace · Owner access only
        </p>
        <p className="text-xs text-muted-foreground text-center mt-4">
          First time here? Provision your owner account using the README setup
          instructions.
        </p>
      </div>
    </main>
  );
}
