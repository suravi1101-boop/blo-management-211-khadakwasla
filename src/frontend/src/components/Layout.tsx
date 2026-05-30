import { LoginModal } from "@/components/LoginModal";
import { ToastContainer } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import {
  getCurrentNodalOfficer,
  getCurrentSupervisor,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
  logoutAdmin,
  logoutNodalOfficer,
  logoutSuperAdmin,
  logoutSupervisor,
} from "@/lib/auth";
import { useEffect, useState } from "react";
import { useBackendActorCtx } from "../lib/actorContext";

export type TabKey =
  | "blo-list"
  | "excellent-blo"
  | "polling-stations"
  | "blo-management"
  | "appointment-orders"
  | "supervisors"
  | "nodal-officers"
  | "honorarium"
  | "notice"
  | "aavak-javak"
  | "official-documents"
  | "blo-voter-id"
  | "super-admin";

interface Tab {
  key: TabKey;
  label: string;
  isPublic: boolean;
  requiresSuperAdmin?: boolean;
  requiresAdmin?: boolean;
  requiresSupervisor?: boolean;
  requiresNodal?: boolean;
}

const TABS: Tab[] = [
  { key: "blo-list", label: "BLO मुख्य यादी", isPublic: true },
  { key: "excellent-blo", label: "उत्कृष्ट BLO", isPublic: true },
  {
    key: "polling-stations",
    label: "मतदान केंद्र यादी",
    isPublic: true,
    requiresAdmin: true,
    requiresSupervisor: true,
  },
  {
    key: "supervisors",
    label: "पर्यवेक्षक यादी",
    isPublic: true,
    requiresAdmin: true,
    requiresSupervisor: true,
    requiresNodal: true,
  },
  {
    key: "nodal-officers",
    label: "नोडल अधिकारी यादी",
    isPublic: true,
    requiresAdmin: true,
  },
  {
    key: "blo-management",
    label: "BLO व्यवस्थापन",
    isPublic: false,
    requiresAdmin: true,
    requiresSupervisor: true,
  },
  {
    key: "appointment-orders",
    label: "नियुक्ती आदेश",
    isPublic: false,
    requiresAdmin: true,
    requiresSupervisor: true,
  },
  {
    key: "blo-voter-id",
    label: "BLO ओळखपत्र क्रमांक",
    isPublic: false,
    requiresAdmin: true,
  },
  {
    key: "honorarium",
    label: "मानधन व्यवस्थापन",
    isPublic: false,
    requiresAdmin: true,
    requiresSupervisor: true,
  },
  {
    key: "notice",
    label: "नोटीस व्यवस्थापन",
    isPublic: false,
    requiresAdmin: true,
    requiresSupervisor: true,
    requiresNodal: true,
  },
  {
    key: "aavak-javak",
    label: "आवक-जावक नोंदवही",
    isPublic: false,
    requiresAdmin: true,
  },
  {
    key: "official-documents",
    label: "शासकीय दस्तऐवज",
    isPublic: false,
    requiresAdmin: true,
    requiresSupervisor: true,
    requiresNodal: true,
  },
];

export interface LayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onSuperAdminTrigger: () => void;
  children: React.ReactNode;
  selectedConstituency?: string;
  onBackToHome?: () => void;
}

export function Layout({
  activeTab,
  onTabChange,
  onSuperAdminTrigger,
  children,
  selectedConstituency,
  onBackToHome,
}: LayoutProps) {
  const actor = useBackendActorCtx();
  const isFetching = actor === null;
  const [superAdmin, setSuperAdmin] = useState<boolean>(isSuperAdminLoggedIn);
  const [admin, setAdmin] = useState<boolean>(isAdminLoggedIn);
  const [supervisor, setSupervisor] = useState(getCurrentSupervisor);
  const [nodal, setNodal] = useState(getCurrentNodalOfficer);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginType, setLoginType] = useState<
    "supervisor" | "nodal" | "admin" | "superAdmin"
  >("admin");

  const refreshAuth = () => {
    setSuperAdmin(isSuperAdminLoggedIn());
    setAdmin(isAdminLoggedIn());
    setSupervisor(getCurrentSupervisor());
    setNodal(getCurrentNodalOfficer());
  };

  const isAnyUserLoggedIn =
    superAdmin || admin || supervisor !== null || nodal !== null;

  const visibleTabs = TABS.filter((t) => {
    if (t.isPublic) return true;
    if (superAdmin) return false; // Super Admin sees no constituency tabs
    if (admin) return !!t.requiresAdmin;
    if (supervisor !== null) return !!t.requiresSupervisor;
    if (nodal !== null) return !!t.requiresNodal;
    return false;
  });

  const handleLogout = () => {
    logoutSuperAdmin();
    logoutAdmin();
    logoutSupervisor();
    logoutNodalOfficer();
    refreshAuth();
    const current = TABS.find((t) => t.key === activeTab);
    if (current && !current.isPublic) onTabChange("blo-list");
  };

  const loggedInName = superAdmin
    ? "Super Admin"
    : admin
      ? "Admin"
      : supervisor
        ? supervisor.name
        : nodal
          ? nodal.name
          : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        onSuperAdminTrigger();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSuperAdminTrigger]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header
        className="bg-card border-b border-primary/20 sticky top-0 z-40 shadow-[0_2px_16px_rgba(0,212,255,0.08)]"
        data-ocid="layout.header"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between py-2 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/60 flex items-center justify-center text-xl select-none shadow-[0_0_12px_rgba(0,212,255,0.3)]"
                aria-label="BLO Management"
              >
                🗳️
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-primary leading-tight truncate drop-shadow-[0_0_6px_rgba(0,212,255,0.5)]">
                  {selectedConstituency
                    ? `${selectedConstituency} — BLO व्यवस्थापन प्रणाली`
                    : "BLO व्यवस्थापन प्रणाली"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isFetching && (
                <span className="text-xs text-primary animate-pulse hidden sm:inline">
                  लोड होत आहे...
                </span>
              )}
              {!isAnyUserLoggedIn && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                    onClick={() => {
                      setLoginType("admin");
                      setShowLoginModal(true);
                    }}
                    data-ocid="layout.login_button"
                  >
                    लॉगिन
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    onClick={() => {
                      setLoginType("supervisor");
                      setShowLoginModal(true);
                    }}
                    data-ocid="layout.supervisor_login_button"
                  >
                    पर्यवेक्षक लॉगिन
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    onClick={() => {
                      setLoginType("nodal");
                      setShowLoginModal(true);
                    }}
                    data-ocid="layout.nodal_login_button"
                  >
                    नोडल अधिकारी लॉगिन
                  </Button>
                </>
              )}
              {isAnyUserLoggedIn && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary hidden sm:inline truncate max-w-[8rem] font-semibold">
                    {loggedInName}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                    onClick={handleLogout}
                    data-ocid="layout.logout_button"
                  >
                    लॉगआउट
                  </Button>
                </div>
              )}
              {onBackToHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  onClick={onBackToHome}
                  data-ocid="layout.back_to_home_button"
                >
                  ← मुख्य पान
                </Button>
              )}
            </div>
          </div>

          {/* Navigation tabs */}
          <div
            className="flex gap-0.5 overflow-x-auto pb-0"
            role="tablist"
            aria-label="नेव्हिगेशन"
          >
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => {
                  onTabChange(tab.key);
                  try {
                    sessionStorage.setItem("activeTab", tab.key);
                  } catch {
                    /* ignore */
                  }
                }}
                className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.key
                    ? "border-primary text-primary bg-primary/10 shadow-[0_1px_8px_rgba(0,212,255,0.15)]"
                    : "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/30"
                }`}
                data-ocid={`layout.tab.${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4"
        data-ocid="layout.main"
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        className="bg-card/60 border-t border-primary/10 mt-auto"
        data-ocid="layout.footer"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} • 211 खडकवासळा विधानसभा मतदारसंघ
          </span>
        </div>
      </footer>

      <LoginModal
        open={showLoginModal}
        loginType={loginType}
        onSuccess={() => {
          setShowLoginModal(false);
          refreshAuth();
        }}
        onClose={() => setShowLoginModal(false)}
      />
      <ToastContainer />
    </div>
  );
}
