import { createActor } from "@/backend";
import type { ConstituencyConfig } from "@/backend";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useConstituencyConfigs,
  useSetConstituencyEnabled,
} from "@/hooks/useQueries";
import { isSuperAdminLoggedIn } from "@/lib/auth";
import {
  changeSuperAdminPassword,
  getNodalOfficers,
  getPasswordHistory,
  getSupervisors,
} from "@/lib/backendService";
import type {
  NodalOfficer,
  PasswordHistoryEntry,
  Supervisor,
} from "@/lib/backendService";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function SuperAdminPage() {
  const { actor, isFetching } = useActor(createActor);
  const _qc = useQueryClient();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);

  const isAdmin = isSuperAdminLoggedIn();

  const { data: configs = [] } = useConstituencyConfigs();
  const setEnabledMutation = useSetConstituencyEnabled();

  const { data: supervisors = [] } = useQuery<Supervisor[]>({
    queryKey: ["supervisors"],
    queryFn: async () => {
      if (!actor) return [];
      return getSupervisors(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const { data: nodalOfficers = [] } = useQuery<NodalOfficer[]>({
    queryKey: ["nodalOfficers"],
    queryFn: async () => {
      if (!actor) return [];
      return getNodalOfficers(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const { data: pwdHistory = [] } = useQuery<PasswordHistoryEntry[]>({
    queryKey: ["passwordHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return getPasswordHistory(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const handleToggle = async (constituencyId: string, enabled: boolean) => {
    setSavingToggle(constituencyId);
    try {
      await setEnabledMutation.mutateAsync({ constituencyId, enabled });
      toast(enabled ? "मतदारसंघ सक्रिय केला" : "मतदारसंघ निष्क्रिय केला", "success");
    } catch (err) {
      toast(
        `त्रुटी: ${err instanceof Error ? err.message : "बदल अयशस्वी"}`,
        "error",
      );
    } finally {
      setSavingToggle(null);
    }
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdError("नवीन पासवर्ड जुळत नाही");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("पासवर्ड किमान 6 अक्षरे असावा");
      return;
    }
    if (!actor) {
      setPwdError("बॅकेंड उपलब्ध नाही");
      return;
    }
    setSavingPwd(true);
    setPwdError("");
    try {
      const ok = await changeSuperAdminPassword(actor, currentPwd, newPwd);
      if (ok) {
        toast("पासवर्ड यशस्वीरित्या बदलले", "success");
        setShowChangePwd(false);
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        setPwdError("आधीचा पासवर्ड चुकीची");
      }
    } catch {
      setPwdError("पासवर्ड बदलताना त्रुटी आली");
    } finally {
      setSavingPwd(false);
    }
  };

  if (!isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-ocid="super-admin.page"
      >
        <span className="text-4xl">🔒</span>
        <p className="text-muted-foreground">
          हे पान फक्त सुपर अडमिनसाठी आहे. Ctrl+Shift+A वापरा.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-ocid="super-admin.page">
      <h2 className="text-lg font-bold text-primary">Super Admin पॅनल</h2>

      {/* Constituency Toggle — all constituencies */}
      <section className="bg-card rounded-lg border p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-base text-foreground">
          मतदारसंघ नियंत्रण
        </h3>
        {configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">कोणतेही मतदारसंघ नाही.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {configs.map((constituency: ConstituencyConfig, idx: number) => (
              <div
                key={constituency.id}
                className="flex items-center justify-between gap-4 border border-border rounded-md px-3 py-2 bg-muted/20"
                data-ocid={`super-admin.constituency.item.${idx + 1}`}
              >
                <span className="text-sm font-medium">
                  {constituency.id} {constituency.name ?? ""}
                </span>
                <div className="flex items-center gap-3">
                  {savingToggle === constituency.id && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      जतन होत आहे...
                    </span>
                  )}
                  <Switch
                    checked={constituency.isEnabled ?? true}
                    onCheckedChange={(checked) =>
                      handleToggle(constituency.id, checked)
                    }
                    disabled={savingToggle === constituency.id}
                    data-ocid={`super-admin.constituency.toggle.${idx + 1}`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      constituency.isEnabled ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {constituency.isEnabled ? "सक्रिय" : "निष्क्रिय"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Password Management */}
      <section className="bg-card rounded-lg border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-foreground">
            पासवर्ड व्यवस्थापन
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowChangePwd(true)}
            data-ocid="super-admin.change_pwd_button"
          >
            पासवर्ड बदला
          </Button>
        </div>

        {/* All passwords table */}
        <div className="overflow-x-auto rounded border bg-muted/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-semibold">नाव</th>
                <th className="px-3 py-2 text-left font-semibold">पद</th>
                <th className="px-3 py-2 text-left font-semibold">प्रकार</th>
                <th className="px-3 py-2 text-left font-semibold">
                  पासवर्ड (readonly)
                </th>
              </tr>
            </thead>
            <tbody>
              {supervisors.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-b last:border-0"
                  data-ocid={`super-admin.supervisor_pwd.${i + 1}`}
                >
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.designation}</td>
                  <td className="px-3 py-2 text-xs">पर्यवेक्षक</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.password}</td>
                </tr>
              ))}
              {nodalOfficers.map((o, i) => (
                <tr
                  key={o.id}
                  className="border-b last:border-0"
                  data-ocid={`super-admin.nodal_pwd.${i + 1}`}
                >
                  <td className="px-3 py-2">{o.name}</td>
                  <td className="px-3 py-2">{o.designation}</td>
                  <td className="px-3 py-2 text-xs">नोडल</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.password}</td>
                </tr>
              ))}
              {supervisors.length === 0 && nodalOfficers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-muted-foreground text-sm"
                  >
                    कोणतेही वापरकर्ते नाही
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Password History */}
      <section className="bg-card rounded-lg border p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-base text-foreground">
          पासवर्ड इतिहास
        </h3>
        {pwdHistory.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-ocid="super-admin.history.empty_state"
          >
            अद्याप कोणतीही नोंद नाही.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border bg-muted/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-3 py-2 text-left font-semibold">कोण</th>
                  <th className="px-3 py-2 text-left font-semibold">पद</th>
                  <th className="px-3 py-2 text-left font-semibold">कृती</th>
                  <th className="px-3 py-2 text-left font-semibold">बदलकर्ता</th>
                  <th className="px-3 py-2 text-left font-semibold">केव्हा</th>
                </tr>
              </thead>
              <tbody>
                {pwdHistory.map((h, i) => (
                  <tr
                    key={`${h.timestamp}-${i}`}
                    className="border-b last:border-0"
                    data-ocid={`super-admin.history.item.${i + 1}`}
                  >
                    <td className="px-3 py-2">{h.constituencyId}</td>
                    <td className="px-3 py-2">{h.role}</td>
                    <td className="px-3 py-2">{h.action}</td>
                    <td className="px-3 py-2">{h.changedBy}</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(Number(h.timestamp) / 1_000_000).toLocaleString(
                        "mr-IN",
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Change Password Dialog */}
      <Dialog
        open={showChangePwd}
        onOpenChange={(v) => !v && setShowChangePwd(false)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="super-admin.changepwd.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              Super Admin पासवर्ड बदला
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePwd} className="flex flex-col gap-3 mt-2">
            <div>
              <Label htmlFor="current-pwd">आधीचा पासवर्ड</Label>
              <Input
                id="current-pwd"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
                autoFocus
                data-ocid="super-admin.current_pwd.input"
              />
            </div>
            <div>
              <Label htmlFor="new-pwd-sa">नवीन पासवर्ड</Label>
              <Input
                id="new-pwd-sa"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                data-ocid="super-admin.new_pwd.input"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pwd">पासवर्ड पुष्टी करा</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                data-ocid="super-admin.confirm_pwd.input"
              />
            </div>
            {pwdError && (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-ocid="super-admin.pwd.error_state"
              >
                {pwdError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangePwd(false)}
                data-ocid="super-admin.changepwd.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="submit"
                disabled={savingPwd}
                data-ocid="super-admin.changepwd.confirm_button"
              >
                {savingPwd ? "बदलत आहे..." : "पासवर्ड बदला"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
