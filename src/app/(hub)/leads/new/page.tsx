import { ActionForm, Field } from "@/components/leads/forms";
export default function Page() {
  return (
    <section className="panel p-6 max-w-3xl">
      <h2 className="font-semibold mb-4">Add lead manually</h2>
      <ActionForm command="create" label="Add lead">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Company name" name="companyName" required />
          <Field label="Organisasjonsnummer" name="orgNumber" required />
          <Field label="Website (optional)" name="website" />
          <Field
            label="Public contact email (optional)"
            name="email"
            type="email"
          />
          <Field label="Industry" name="industry" />
          <Field label="Municipality" name="municipality" />
          <Field label="Tags" name="tags" />
        </div>
        <label className="block text-sm">
          Notes
          <textarea name="notes" className="field w-full" rows={4} />
        </label>
        <p className="text-xs text-muted-foreground">
          Contact details are unverified. Check the source and recipient in the
          lead profile before contact.
        </p>
      </ActionForm>
    </section>
  );
}
