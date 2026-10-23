import { NewProjectForm } from "./client-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-ink-600">
          Give your wall a name. You'll get a public URL and a collection link immediately.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
