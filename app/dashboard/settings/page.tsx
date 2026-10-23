import { SettingsClient } from "./client-settings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-600">Workspace and profile.</p>
      </div>
      <SettingsClient />
    </div>
  );
}
