import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card } from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, AlertTriangle, User, Shield, Bell, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";

const TABS = [
  { id: "Profile", icon: User },
  { id: "Security", icon: Shield },
  { id: "Notifications", icon: Bell },
  { id: "Danger", icon: Trash2 },
] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[--text-secondary] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] mt-1 text-[--text-muted]">{hint}</p>}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-10 px-3 rounded-lg text-sm text-white outline-none bg-[--bg-primary] border border-[--border] focus:border-[--accent-primary] transition-colors disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { success: ok, error: toastErr } = useToast();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]["id"]>("Profile");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [delText, setDelText] = useState("");
  const [showDel, setShowDel] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => { await api.patch("/account/profile", { fullName: fullName.trim() }); },
    onSuccess: () => { ok("Saved", "Profile updated."); refreshUser(); },
    onError: () => toastErr("Failed", "Could not update profile."),
  });

  const changePass = useMutation({
    mutationFn: async () => {
      if (newPass !== confPass) throw new Error("Passwords do not match");
      if (newPass.length < 8) throw new Error("Minimum 8 characters");
      await api.post("/auth/change-password", { currentPassword: curPass, newPassword: newPass });
    },
    onSuccess: () => { ok("Updated", "Use your new password next login."); setCurPass(""); setNewPass(""); setConfPass(""); },
    onError: (e: any) => toastErr("Failed", e.message ?? e.response?.data?.error ?? "Check your current password."),
  });

  const NOTIFS = [
    { key: "bots", label: "Bot Status Alerts", desc: "When your bots stop or crash." },
    { key: "billing", label: "Billing Updates", desc: "Invoices and renewal reminders." },
    { key: "security", label: "Security Alerts", desc: "Logins and account changes." },
    { key: "news", label: "Newsletter", desc: "New features and updates." },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Manage your account, security and preferences." />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
        {/* Side tabs */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-medium transition-colors shrink-0 lg:w-full text-left"
                style={
                  active
                    ? { background: "var(--accent-soft)", color: "var(--accent-primary)" }
                    : { color: "var(--text-secondary)" }
                }
              >
                <Icon size={15} />
                {t.id}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex flex-col gap-4">
          {activeTab === "Profile" && (
            <Card className="p-5 lg:p-6">
              <div className="flex flex-col gap-4">
                <Field label="Full Name">
                  <StyledInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                </Field>
                <Field label="Email Address" hint="Contact support to change your email.">
                  <StyledInput value={user?.email ?? ""} disabled />
                </Field>
                <div className="flex items-center justify-between pt-2 border-t border-[--border]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: user?.emailVerified ? "var(--success)" : "var(--danger)" }} />
                    <span className="text-xs text-[--text-secondary]">{user?.emailVerified ? "Email verified" : "Email not verified"}</span>
                  </div>
                  <button
                    onClick={() => saveProfile.mutate()}
                    disabled={saveProfile.isPending || !fullName.trim() || fullName.trim() === user?.fullName}
                    className="h-9 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-40"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    <Save size={12} />
                    {saveProfile.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "Security" && (
            <>
              <Card className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">Two-Factor Authentication</p>
                    <p className="text-xs text-[--text-secondary]">
                      {user?.totpEnabled ? "Active — your account is protected." : "Add an extra layer of security."}
                    </p>
                  </div>
                  <Switch checked={!!user?.totpEnabled} />
                </div>
              </Card>

              <Card className="p-5 lg:p-6">
                <p className="text-sm font-semibold text-white mb-4">Change Password</p>
                <div className="flex flex-col gap-4">
                  <Field label="Current Password">
                    <div className="relative">
                      <StyledInput type={showCur ? "text" : "password"} value={curPass} onChange={(e) => setCurPass(e.target.value)} placeholder="••••••••" />
                      <button onClick={() => setShowCur((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted]">
                        {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="New Password" hint="At least 8 characters">
                    <div className="relative">
                      <StyledInput type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min. 8 characters" />
                      <button onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted]">
                        {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm New Password">
                    <StyledInput type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} placeholder="Repeat password" />
                  </Field>
                  <button
                    onClick={() => changePass.mutate()}
                    disabled={changePass.isPending || !curPass || !newPass || !confPass}
                    className="self-start h-9 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    {changePass.isPending ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </Card>
            </>
          )}

          {activeTab === "Notifications" && (
            <Card className="overflow-hidden">
              {NOTIFS.map((n, i) => (
                <div key={n.key} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[--border] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{n.label}</p>
                    <p className="text-xs text-[--text-secondary]">{n.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 3} />
                </div>
              ))}
            </Card>
          )}

          {activeTab === "Danger" && (
            <div className="rounded-xl bg-[--bg-secondary] p-5 lg:p-6 border border-[--danger]/20">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[--danger]" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Delete Account</p>
                  <p className="text-xs leading-relaxed text-[--text-secondary]">
                    Permanently deletes your account, all bots, files, and billing history. This action{" "}
                    <span className="font-semibold text-[--danger]">cannot be undone</span>.
                  </p>
                </div>
              </div>
              {!showDel ? (
                <button
                  onClick={() => setShowDel(true)}
                  className="h-9 px-4 rounded-lg text-xs font-bold border"
                  style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}
                >
                  Delete Account
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field label="Type DELETE to confirm">
                    <StyledInput value={delText} onChange={(e) => setDelText(e.target.value)} placeholder="DELETE" style={{ letterSpacing: "0.1em" }} />
                  </Field>
                  <div className="flex gap-2">
                    <button
                      disabled={delText !== "DELETE"}
                      onClick={() => toastErr("Contact support", "Email support@redon3.com to delete your account.")}
                      className="h-9 px-4 rounded-lg text-xs font-black disabled:opacity-40 text-white"
                      style={{ background: "var(--danger)" }}
                    >
                      Confirm Delete
                    </button>
                    <button onClick={() => setShowDel(false)} className="h-9 px-3 rounded-lg text-xs text-[--text-secondary]">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
