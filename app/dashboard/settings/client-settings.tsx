"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { DEMO_USER } from "@/lib/demo-data";

export function SettingsClient() {
  const [name, setName] = useState(DEMO_USER.name);
  const [workspace, setWorkspace] = useState(DEMO_USER.workspace);
  const toast = useToast();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Used on testimonial replies and in your dashboard.</CardDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast.show({ title: "Profile saved (demo)" });
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <Button variant="secondary" type="button" onClick={() => toast.show({ title: "Avatar upload not wired" })}>
              Change avatar
            </Button>
          </div>
          <Field htmlFor="profile-name" label="Display name">
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field htmlFor="profile-email" label="Email" hint="Read-only in the demo.">
            <Input id="profile-email" value={DEMO_USER.email} readOnly />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="accent">Save</Button>
          </div>
        </form>
      </Card>
      <Card>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Your default home for all walls.</CardDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast.show({ title: "Workspace saved (demo)" });
          }}
        >
          <Field htmlFor="ws-name" label="Workspace name">
            <Input id="ws-name" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="accent">Save</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
