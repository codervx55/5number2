"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Lock, Mail, User } from "lucide-react";

export default function SettingsPage() {
  const [email, setEmail] = useState("you@example.com");
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-[19px] font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Manage your account and notification preferences.
          </p>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <User size={15} className="text-primary-600" />
              <p className="text-[13.5px] font-medium text-foreground">Account</p>
            </div>
            <label className="mb-1.5 block text-[12.5px] text-muted-foreground">
              Email address
            </label>
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-xs" />
              <Button variant="secondary" size="sm">
                Save
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bell size={15} className="text-primary-600" />
              <p className="text-[13.5px] font-medium text-foreground">Notifications</p>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="SMS received alerts"
                description="Get notified in-app the moment a code arrives."
                checked={notifySms}
                onChange={setNotifySms}
              />
              <ToggleRow
                label="Email receipts"
                description="Receive an email receipt after each purchase."
                checked={notifyEmail}
                onChange={setNotifyEmail}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lock size={15} className="text-primary-600" />
              <p className="text-[13.5px] font-medium text-foreground">Security</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-foreground">Password</p>
                <p className="text-[12px] text-muted-foreground">Last changed 3 months ago</p>
              </div>
              <Button variant="secondary" size="sm">
                Change password
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] text-foreground">{label}</p>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary-600" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
