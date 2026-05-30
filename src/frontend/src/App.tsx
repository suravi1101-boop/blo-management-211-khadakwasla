import { useState } from "react";
import { Layout } from "./components/Layout";
import type { TabKey } from "./components/Layout";
import { LoginModal } from "./components/LoginModal";
import { ToastContainer } from "./components/Toast";
import {
  getCurrentNodalOfficer,
  getCurrentSupervisor,
  isAdminLoggedIn,
} from "./lib/auth";
import { AavakJavakRegister } from "./pages/AavakJavakRegister";
import { AppointmentOrdersPage } from "./pages/AppointmentOrdersPage";
import { BLOListPage } from "./pages/BLOListPage";
import { BLOManagementPage } from "./pages/BLOManagementPage";
import { BLOVoterIdPage } from "./pages/BLOVoterIdPage";
import { ConstituencyHome } from "./pages/ConstituencyHome";
import { ExcellentBLOPage } from "./pages/ExcellentBLOPage";
import { HonorariumManagement } from "./pages/HonorariumManagement";
import { NodalOfficersPage } from "./pages/NodalOfficersPage";
import { NoticeManagement } from "./pages/NoticeManagement";
import { OfficialDocuments } from "./pages/OfficialDocuments";
import { PollingStationsPage } from "./pages/PollingStationsPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { SupervisorsPage } from "./pages/SupervisorsPage";

function AppInner() {
  const [selectedConstituency, setSelectedConstituency] = useState<
    string | null
  >(() => {
    try {
      return sessionStorage.getItem("selectedConstituency") || null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      return (sessionStorage.getItem("activeTab") as TabKey) || "blo-list";
    } catch {
      return "blo-list";
    }
  });
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [, forceRender] = useState(0);

  const handleSuperAdminTrigger = () => setShowSuperAdminLogin(true);

  const handleSelectConstituency = (id: string) => {
    setSelectedConstituency(id);
    try {
      sessionStorage.setItem("selectedConstituency", id);
    } catch {
      /* ignore */
    }
  };

  const handleBackToHome = () => {
    setSelectedConstituency(null);
    setActiveTab("blo-list");
    try {
      sessionStorage.removeItem("selectedConstituency");
      sessionStorage.removeItem("activeTab");
    } catch {
      /* ignore */
    }
  };

  const renderPage = () => {
    const adminLoggedIn = isAdminLoggedIn();
    const supervisor = getCurrentSupervisor();
    const nodal = getCurrentNodalOfficer();
    switch (activeTab) {
      case "blo-list":
        return <BLOListPage />;
      case "excellent-blo":
        return <ExcellentBLOPage />;
      case "polling-stations":
        return <PollingStationsPage />;
      case "blo-management":
        return <BLOManagementPage />;
      case "appointment-orders":
        return <AppointmentOrdersPage />;
      case "supervisors":
        return <SupervisorsPage />;
      case "nodal-officers":
        return <NodalOfficersPage />;
      case "honorarium":
        return <HonorariumManagement />;
      case "notice":
        return (
          <NoticeManagement isSupMode={!!supervisor} isNodalMode={!!nodal} />
        );
      case "blo-voter-id":
        return <BLOVoterIdPage />;
      case "aavak-javak":
        return (
          <AavakJavakRegister
            isAdminLoggedIn={adminLoggedIn}
            constituencyName="211 खडकवासळा"
          />
        );
      case "official-documents":
        return (
          <OfficialDocuments
            isAdminLoggedIn={adminLoggedIn}
            isSupMode={!!supervisor}
            isNodalMode={!!nodal}
          />
        );
      case "super-admin":
        return <SuperAdminPage />;
      default:
        return <BLOListPage />;
    }
  };

  // Show constituency selection screen first
  if (!selectedConstituency) {
    return (
      <>
        <ConstituencyHome
          onSelectConstituency={handleSelectConstituency}
          onSuperAdminLogin={handleSuperAdminTrigger}
        />
        <ToastContainer />
        <LoginModal
          open={showSuperAdminLogin}
          loginType="superAdmin"
          onSuccess={() => {
            setShowSuperAdminLogin(false);
            setSelectedConstituency("211");
            setActiveTab("super-admin");
            forceRender((n) => n + 1);
          }}
          onClose={() => setShowSuperAdminLogin(false)}
        />
      </>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSuperAdminTrigger={handleSuperAdminTrigger}
      selectedConstituency={selectedConstituency}
      onBackToHome={handleBackToHome}
    >
      {renderPage()}
      <ToastContainer />
      <LoginModal
        open={showSuperAdminLogin}
        loginType="superAdmin"
        onSuccess={() => {
          setShowSuperAdminLogin(false);
          setActiveTab("super-admin");
          forceRender((n) => n + 1);
        }}
        onClose={() => setShowSuperAdminLogin(false)}
      />
    </Layout>
  );
}

export default function App() {
  return <AppInner />;
}
