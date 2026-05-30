import { createActor } from "@/backend";
import { toast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PUNE_CONSTITUENCIES } from "@/data/constituencyData";
import {
  getCurrentSupervisor,
  isAdminLoggedIn,
  isSuperAdminLoggedIn,
} from "@/lib/auth";
import {
  createAppointmentOrder,
  getAppointmentOrders,
  getBLOs,
  getOrderSettings,
  saveOrderSettings,
} from "@/lib/backendService";
import type {
  AppointmentOrder,
  BLO,
  OrderSettings,
} from "@/lib/backendService";
import { printBLOOrder } from "@/lib/bloOrderPrint";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

export function AppointmentOrdersPage() {
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBloId, setSelectedBloId] = useState("");
  const [creating, setCreating] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [_settings, setSettings] = useState<OrderSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    orderHeaderLine1: "",
    orderHeaderLine2: "",
    orderHeaderPhone: "",
    orderHeaderEmail: "",
    orderOfficerName: "",
    orderOfficerDesignation: "",
    orderOfficerConstituency: "",
    orderOfficerTehsil: "",
  });

  const isAdmin = isSuperAdminLoggedIn() || isAdminLoggedIn();
  const supervisor = getCurrentSupervisor();
  const canAccess = isAdmin || !!supervisor;
  const activeConstituency =
    supervisor?.constituencyId ?? (isAdminLoggedIn() ? "211" : "211");

  const { data: orders = [], isLoading: ordersLoading } = useQuery<
    AppointmentOrder[]
  >({
    queryKey: ["appointmentOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return getAppointmentOrders(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const { data: blos = [] } = useQuery<BLO[]>({
    queryKey: ["blos"],
    queryFn: async () => {
      if (!actor) return [];
      return getBLOs(actor);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  useQuery<OrderSettings | null>({
    queryKey: ["orderSettings", activeConstituency],
    queryFn: async () => {
      if (!actor) return null;
      const s = await getOrderSettings(actor, activeConstituency);
      if (s) {
        setSettings(s);
        setSettingsForm({
          orderHeaderLine1: s.orderHeaderLine1 ?? "",
          orderHeaderLine2: s.orderHeaderLine2 ?? "",
          orderHeaderPhone: s.orderHeaderPhone ?? "",
          orderHeaderEmail: s.orderHeaderEmail ?? "",
          orderOfficerName: s.orderOfficerName ?? "",
          orderOfficerDesignation: s.orderOfficerDesignation ?? "",
          orderOfficerConstituency: s.orderOfficerConstituency ?? "",
          orderOfficerTehsil: s.orderOfficerTehsil ?? "",
        });
      }
      return s;
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });

  const bloMap = Object.fromEntries(blos.map((b) => [b.id, b]));

  useEffect(() => {
    if (actor && activeConstituency) {
      getOrderSettings(actor, activeConstituency)
        .then((s) => {
          if (s) {
            setSettings(s);
            setSettingsForm({
              orderHeaderLine1: s.orderHeaderLine1,
              orderHeaderLine2: s.orderHeaderLine2,
              orderHeaderPhone: s.orderHeaderPhone,
              orderHeaderEmail: s.orderHeaderEmail,
              orderOfficerName: s.orderOfficerName,
              orderOfficerDesignation: s.orderOfficerDesignation,
              orderOfficerConstituency: s.orderOfficerConstituency,
              orderOfficerTehsil: s.orderOfficerTehsil,
            });
          }
        })
        .catch(console.error);
    }
  }, [actor, activeConstituency]);

  const handleSaveOrderSettings = async () => {
    if (!actor || !activeConstituency) return;
    setSavingSettings(true);
    try {
      await saveOrderSettings(actor, {
        ...settingsForm,
        constituencyId: activeConstituency,
        updatedAt: BigInt(Date.now()),
      });
      toast("BLO आदेश सेटिंग्ज जतन झाल्या", "success");
      setShowSettings(false);
    } catch (_e) {
      toast("सेटिंग्ज जतन होऊ शकल्या नाहीत", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !selectedBloId) return;
    setCreating(true);
    try {
      const blo = bloMap[selectedBloId];
      const content = blo
        ? `ठराव क्रमांक ${activeConstituency}/BLO/${new Date().getFullYear()} — श्री/श्रीमती ${blo.name}, ${blo.designation} यांना मतदारसंघ क्र. ${activeConstituency} मध्ये दि. ${new Date().toLocaleDateString("mr-IN")} पासून बूथ स्तर अधिकारी (BLO) म्हणून नियुक्त करण्यात येत आहे.`
        : "नियुक्ती आदेश";
      const result = await createAppointmentOrder(
        actor,
        selectedBloId,
        content,
      );
      if (result) {
        qc.invalidateQueries({ queryKey: ["appointmentOrders"] });
        toast("नियुक्ती आदेश तयार झाला", "success");
        setShowCreate(false);
        setSelectedBloId("");
      } else {
        toast("आदेश तयार करणे अयशस्वी", "error");
      }
    } catch {
      toast("आदेश तयार करताना त्रुटी आली", "error");
    } finally {
      setCreating(false);
    }
  };

  if (!canAccess) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-ocid="appointment-orders.page"
      >
        <span className="text-4xl">🔒</span>
        <p className="text-muted-foreground">
          हे पान पाहण्यासाठी लॉगिन आवश्यक आहे.
        </p>
      </div>
    );
  }

  const statusClass = (s: string) =>
    s === "issued"
      ? "bg-green-100 text-green-800"
      : s === "pending"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-muted text-muted-foreground";
  const statusLabel = (s: string) =>
    s === "issued" ? "जारी" : s === "pending" ? "प्रलंबित" : s;

  return (
    <div className="flex flex-col gap-4" data-ocid="appointment-orders.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">नियुक्ती आदेश</h2>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1"
              data-ocid="appointment-orders.settings_button"
            >
              <Settings size={16} />
              BLO आदेश सेटिंग्ज
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreate(true)}
              data-ocid="appointment-orders.create_button"
            >
              + नवीन आदेश तयार करा
            </Button>
          </div>
        )}
      </div>

      {ordersLoading ? (
        <div
          className="flex items-center justify-center py-12"
          data-ocid="appointment-orders.loading_state"
        >
          <span className="text-muted-foreground animate-pulse">
            लोड होत आहे...
          </span>
        </div>
      ) : orders.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-2"
          data-ocid="appointment-orders.empty_state"
        >
          <span className="text-4xl">📄</span>
          <p className="text-muted-foreground">
            अद्याप कोणतेही नियुक्ती आदेश नाही. वरील बटण दाबून आदेश तयार करा.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-right font-semibold">क्र.</th>
                <th className="px-3 py-2 text-left font-semibold">आदेश क्र.</th>
                <th className="px-3 py-2 text-left font-semibold">BLO नाव</th>
                <th className="px-3 py-2 text-left font-semibold">तारीख</th>
                <th className="px-3 py-2 text-left font-semibold">स्थिती</th>
                <th className="px-3 py-2 text-left font-semibold">कृती</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => {
                const blo = bloMap[o.bloId];
                const dateStr = new Date(
                  Number(o.issuedDate) / 1_000_000,
                ).toLocaleDateString("mr-IN");
                return (
                  <tr
                    key={o.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                    data-ocid={`appointment-orders.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-right font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {o.orderNumber}
                    </td>
                    <td className="px-3 py-2">{blo?.name ?? o.bloId}</td>
                    <td className="px-3 py-2">{dateStr}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(o.status)}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const constEntry = PUNE_CONSTITUENCIES.find(
                            (c) => c.id === activeConstituency,
                          );
                          const constName = constEntry
                            ? `${constEntry.name} विधानसभा मतदारसंघ`
                            : `${activeConstituency} विधानसभा मतदारसंघ`;
                          printBLOOrder(
                            actor,
                            activeConstituency,
                            {
                              name: blo?.name,
                              designation: blo?.designation,
                              office:
                                (blo as BLO & { officeName?: string })
                                  ?.officeName ?? blo?.officeAddress,
                              officeAddress: blo?.officeAddress,
                              partNumber: blo?.partNumber,
                              pollingStationNumber: blo?.partNumber,
                              pollingStationName: blo?.partName ?? "",
                            },
                            constName,
                          );
                        }}
                        data-ocid={`appointment-orders.print_button.${i + 1}`}
                      >
                        छापा
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onOpenChange={(v) => !v && setShowSettings(false)}
      >
        <DialogContent
          className="sm:max-w-lg max-h-[80vh] overflow-y-auto"
          data-ocid="appointment-orders.settings.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">BLO आदेश सेटिंग्ज</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">
                कार्यालय ओळख ओळ १
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderHeaderLine1}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderHeaderLine1: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                कार्यालय ओळख ओळ २
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderHeaderLine2}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderHeaderLine2: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                संपर्क क्रमांक
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderHeaderPhone}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderHeaderPhone: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">ई-मेल</Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderHeaderEmail}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderHeaderEmail: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                अधिकारी नाव
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderOfficerName}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderOfficerName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                अधिकारी पदनाम
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderOfficerDesignation}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderOfficerDesignation: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                अधिकारी मतदारसंघ
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderOfficerConstituency}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderOfficerConstituency: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">
                अधिकारी तहसील
              </Label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={settingsForm.orderOfficerTehsil}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    orderOfficerTehsil: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSettings(false)}
                data-ocid="appointment-orders.settings.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="button"
                disabled={savingSettings}
                onClick={handleSaveOrderSettings}
                data-ocid="appointment-orders.settings.save_button"
              >
                {savingSettings ? "जतन होत आहे..." : "जतन करा"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(v) => !v && setShowCreate(false)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="appointment-orders.create.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-primary">
              नवीन नियुक्ती आदेश तयार करा
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-2">
            <div>
              <Label
                htmlFor="blo-select"
                className="block text-sm font-medium mb-1"
              >
                BLO निवडा *
              </Label>
              <Select value={selectedBloId} onValueChange={setSelectedBloId}>
                <SelectTrigger
                  id="blo-select"
                  data-ocid="appointment-orders.blo.select"
                >
                  <SelectValue placeholder="BLO निवडा..." />
                </SelectTrigger>
                <SelectContent>
                  {blos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {Number(b.partNumber)} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                data-ocid="appointment-orders.cancel_button"
              >
                रद्द करा
              </Button>
              <Button
                type="submit"
                disabled={creating || !selectedBloId}
                data-ocid="appointment-orders.confirm_button"
              >
                {creating ? "तयार होत आहे..." : "आदेश तयार करा"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
