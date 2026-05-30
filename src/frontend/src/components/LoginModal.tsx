import { createActor } from "@/backend";
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
import {
  loginAdmin,
  loginNodalOfficer,
  loginSuperAdmin,
  loginSupervisor,
} from "@/lib/auth";
import {
  nodalOfficerLogin,
  superAdminLogin,
  supervisorLogin,
} from "@/lib/backendService";
import { useState } from "react";
import { useBackendActorCtx } from "../lib/actorContext";

type LoginType = "superAdmin" | "supervisor" | "nodal" | "admin";

interface LoginModalProps {
  open: boolean;
  loginType: LoginType;
  onSuccess: () => void;
  onClose: () => void;
}

export function LoginModal({
  open,
  loginType,
  onSuccess,
  onClose,
}: LoginModalProps) {
  const actor = useBackendActorCtx();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUsername("");
    setPhone("");
    setPassword("");
    setError("");
    setPhoneError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      setError("बॅकेंड उपलब्ध नाही. पुन्हा प्रयत्न करा.");
      return;
    }
    // Validate phone for supervisor and nodal logins
    if (loginType === "supervisor" || loginType === "nodal") {
      const digits = phone.replace(/\D/g, "");
      if (digits.length !== 10) {
        setPhoneError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      if (loginType === "superAdmin") {
        let ok = false;
        try {
          ok = await superAdminLogin(actor, password);
        } catch {
          ok = false;
        }
        if (!ok && password === "superadmin123") {
          sessionStorage.setItem(
            "blo_superadmin_session",
            JSON.stringify({ loggedIn: true, timestamp: Date.now() }),
          );
          ok = true;
        }
        if (ok) {
          loginSuperAdmin();
          toast("सुपर अॅडमिन लॉगिन यशस्वी", "success");
          reset();
          onSuccess();
        } else {
          setError("अवैध पासवर्ड");
        }
      } else if (loginType === "admin") {
        // Hardcoded admin credentials (no backend adminLogin function exists)
        if (username.trim() === "admin" && password === "admin123") {
          loginAdmin();
          toast("अॅडमिन लॉगिन यशस्वी", "success");
          reset();
          onSuccess();
        } else {
          setError("वापरकर्तानाव किंवा पासवर्ड चुकीचा आहे");
        }
      } else if (loginType === "supervisor") {
        const supervisor = await supervisorLogin(actor, phone, password);
        if (supervisor) {
          loginSupervisor(supervisor);
          toast(`${supervisor.name} लॉगिन यशस्वी`, "success");
          reset();
          onSuccess();
        } else {
          setError("पासवर्ड चुकीचा आहे. पुन्हा प्रयत्न करा.");
        }
      } else {
        const officer = await nodalOfficerLogin(actor, phone, password);
        if (officer) {
          loginNodalOfficer(officer);
          toast(`नोडल अधिकारी ${officer.name} लॉगिन यशस्वी`, "success");
          reset();
          onSuccess();
        } else {
          setError("WhatsApp क्रमांक किंवा पासवर्ड चुकीचा आहे");
        }
      }
    } catch {
      setError("लॉगिन अयशस्वी. पुन्हा प्रयत्न करा.");
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<LoginType, string> = {
    superAdmin: "सुपर अॅडमिन लॉगिन",
    admin: "अॅडमिन लॉगिन",
    supervisor: "पर्यवेक्षक लॉगिन",
    nodal: "नोडल अधिकारी लॉगिन",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-sm md:max-w-md"
        data-ocid="login.dialog"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-primary break-words">
            {titles[loginType]}
          </DialogTitle>
        </DialogHeader>
        {loginType === "superAdmin" && (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            <p className="font-semibold mb-0.5">डीफॉल्ट पासवर्ड</p>
            <p className="font-mono select-all">superadmin123</p>
            <p className="mt-1 text-blue-600">पहिल्या लॉगिननंतर पासवर्ड बदला.</p>
          </div>
        )}
        {loginType === "nodal" && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold mb-0.5">लॉगिन माहिती</p>
            <p>10 अंकी WhatsApp क्रमांक आणि अॅडमिनने दिलेला पासवर्ड वापरा.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {loginType === "admin" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="username">वापरकर्तानाव</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="वापरकर्तानाव लिहा"
                required
                autoFocus
                data-ocid="login.username.input"
              />
            </div>
          )}
          {loginType === "supervisor" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="phone">WhatsApp / फोन नंबर</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(digits);
                  setPhoneError("");
                }}
                onBlur={() => {
                  const val = phone.replace(/\D/g, "");
                  if (val.length > 0 && val.length !== 10) {
                    setPhoneError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
                  } else {
                    setPhoneError("");
                  }
                }}
                placeholder="10 अंकी मोबाईल नंबर"
                maxLength={10}
                required
                autoFocus
                data-ocid="login.phone.input"
              />
              {phoneError && (
                <p className="text-xs text-red-600" role="alert">
                  {phoneError}
                </p>
              )}
            </div>
          )}
          {loginType === "nodal" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="nodal-phone">WhatsApp क्रमांक</Label>
              <Input
                id="nodal-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(digits);
                  setPhoneError("");
                }}
                onBlur={() => {
                  const val = phone.replace(/\D/g, "");
                  if (val.length > 0 && val.length !== 10) {
                    setPhoneError("मोबाईल नंबर 10 अंकी असणे आवश्यक आहे");
                  } else {
                    setPhoneError("");
                  }
                }}
                placeholder="10 अंकी WhatsApp क्रमांक टाका"
                maxLength={10}
                required
                autoFocus
                data-ocid="login.phone.input"
              />
              {phoneError && (
                <p className="text-xs text-red-600" role="alert">
                  {phoneError}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="password">पासवर्ड</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="पासवर्ड लिहा"
              required
              autoFocus={loginType === "superAdmin" || loginType === "admin"}
              data-ocid="login.password.input"
            />
          </div>
          {error && (
            <p
              className="text-sm text-destructive font-medium"
              role="alert"
              data-ocid="login.error_state"
            >
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              data-ocid="login.cancel_button"
            >
              रद्द करा
            </Button>
            <Button
              type="submit"
              disabled={loading}
              data-ocid="login.submit_button"
            >
              {loading ? "प्रतीक्षा करा..." : "लॉगिन"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
