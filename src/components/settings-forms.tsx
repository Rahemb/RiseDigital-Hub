"use client";
import { useActionState } from "react";
import { settingsAction } from "@/app/settings-actions";
import { Button } from "./ui/button";
import { Feedback } from "./business-forms";
export function ProfileForm({
  name,
  email,
  theme,
}: {
  name: string;
  email: string;
  theme: string;
}) {
  const [state, action, pending] = useActionState(
    settingsAction.bind(null, "profile"),
    {},
  );
  return (
    <form action={action} className="panel p-6">
      <h2 className="font-semibold mb-5">Owner profile</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="field">
          Name
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={name}
            autoComplete="name"
          />
        </label>
        <label className="field">
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            defaultValue={email}
            autoComplete="email"
          />
        </label>
        <label className="field">
          Theme
          <select name="theme" defaultValue={theme}>
            <option value="system">Use system theme</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="field">
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={256}
          />
          <span className="text-xs text-muted-foreground">
            Required to change email or password.
          </span>
        </label>
        <label className="field">
          New password
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={14}
            maxLength={256}
          />
        </label>
        <label className="field">
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            maxLength={256}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Leave password fields blank to keep your password. A security change
        signs out other sessions.
      </p>
      <Feedback state={state} />
      <Button className="mt-5" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
type Agency = {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  organizationNumber: string;
  currencyDisplay: string;
  weekStartsOn: number;
  focusDays: number;
};
export function AgencyForm({ agency }: { agency: Agency }) {
  const [state, action, pending] = useActionState(
    settingsAction.bind(null, "agency"),
    {},
  );
  return (
    <form action={action} className="panel p-6">
      <h2 className="font-semibold mb-5">Agency & application preferences</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {(
          [
            ["name", "Agency name"],
            ["email", "Agency email"],
            ["phone", "Phone"],
            ["website", "Website"],
            ["organizationNumber", "Organization number"],
            ["address", "Address"],
          ] as const
        ).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              name={key}
              type={
                key === "email" ? "email" : key === "website" ? "url" : "text"
              }
              defaultValue={agency[key]}
              required={key === "name"}
              maxLength={key === "address" ? 500 : 254}
            />
          </label>
        ))}
        <label className="field">
          Currency display (NOK)
          <select name="currencyDisplay" defaultValue={agency.currencyDisplay}>
            <option value="symbol">Norwegian kr symbol</option>
            <option value="code">NOK currency code</option>
          </select>
        </label>
        <label className="field">
          Calendar week starts on
          <select name="weekStartsOn" defaultValue={agency.weekStartsOn}>
            <option value="1">Monday</option>
            <option value="0">Sunday</option>
          </select>
        </label>
        <label className="field">
          Upcoming focus window (days)
          <input
            type="number"
            name="focusDays"
            required
            min={1}
            max={30}
            defaultValue={agency.focusDays}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        The ledger uses NOK and exact øre amounts. Display preferences never
        convert historical amounts.
      </p>
      <Feedback state={state} />
      <Button className="mt-5" disabled={pending}>
        {pending ? "Saving…" : "Save agency settings"}
      </Button>
    </form>
  );
}
