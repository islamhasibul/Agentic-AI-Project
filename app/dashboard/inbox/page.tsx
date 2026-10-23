import { UnifiedInbox } from "./client-inbox";

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-ink-600">All pending submissions across your walls.</p>
      </div>
      <UnifiedInbox />
    </div>
  );
}
