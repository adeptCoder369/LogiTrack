import { useState, useEffect } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { pickupApi, purchaseOrdersApi, depotInventoryApi, getFileUrl, transportersApi, companiesApi, depotsApi, uploadFile } from "../lib/api";
import { MultiPhotoUpload } from "../components/shared/FileUpload";
import { usePermissions } from "../lib/permissions";
import { toast } from "sonner";
import { Calendar, Eye, FileX, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { VerifyPickupOrdersDataTable } from "@/components/verifyPickup/DataTable";
import { FilterPanel } from "@/components/verifyPickup/FilterPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";

export default function FinalDispatchVerification() {
  const { hasPermission, hasActionPermission, myDepots, myProducts } = usePermissions();
  const canView = hasPermission("Final Dispatch Verification");
  const canVerify = hasActionPermission("final_verify_pickup");
  const [statusFilter, setStatusFilter] = useState("weightment_done");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  const [editingTransporter, setEditingTransporter] = useState({});
  const [editingCompany, setEditingCompany] = useState({});

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [loadedWeights, setLoadedWeights] = useState({});
  const [weightmentSlipFiles, setWeightmentSlipFiles] = useState({});
  const [uploadingWeightment, setUploadingWeightment] = useState({});

  const [inputErrors, setInputErrors] = useState({});

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState({});
  const [depotInventory, setDepotInventory] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [depots, setDepots] = useState([]);

  const [finalVerifiedRows, setFinalVerifiedRows] = useState({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        res,
        poRes,
        depotInventoryRes,
        transporterRes,
        companiesRes,
        depotsRes
      ] = await Promise.all([
        pickupApi.getAll({ status: "weightment_done", start_date: startDate, end_date: endDate }),
        purchaseOrdersApi.getAll(),
        depotInventoryApi.getAll(),
        transportersApi.getAll(),
        companiesApi.getAll(),
        depotsApi.getAll()
      ]);

      setPurchaseOrders(poRes.data || []);
      setDepotInventory(depotInventoryRes.data || []);
      setTransporters(transporterRes.data || []);
      setCompanies(companiesRes.data || []);
      setDepots(depotsRes.data || []);

      const rows = res.data || [];
      setData(rows);

      const verified = {};
      rows.forEach((r) => {
        if (r.status === "final_verified") verified[r.id] = true;
      });
      setFinalVerifiedRows(verified);
    } catch {
      toast.error("Failed to load pickups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleStartDateChange = (val) => {
    const today = new Date().toISOString().split("T")[0];
    if (val > today) { toast.error("Future date not allowed"); return; }
    if (endDate && val > endDate) { toast.error("Start date cannot be after end date"); return; }
    setStartDate(val);
  };

  const handleEndDateChange = (val) => {
    const today = new Date().toISOString().split("T")[0];
    if (val > today) { toast.error("Future date not allowed"); return; }
    if (startDate && val < startDate) { toast.error("End date cannot be before start date"); return; }
    setEndDate(val);
  };

  const getAvailableInventory = (depotId, productId) => {
    const inventory = depotInventory.find(
      (item) => item.depot_id === depotId && item.product_id === productId
    );
    return Number(inventory?.available_quantity || 0);
  };

  const handleWeightmentSlipUpload = async (pickupId, file) => {
    if (!file) return;
    setUploadingWeightment((prev) => ({ ...prev, [pickupId]: true }));
    try {
      const result = await uploadFile(file);
      setWeightmentSlipFiles((prev) => ({ ...prev, [pickupId]: result.file_id }));
      toast.success("Weightment slip uploaded");
    } catch {
      toast.error("Failed to upload weightment slip");
    } finally {
      setUploadingWeightment((prev) => ({ ...prev, [pickupId]: false }));
    }
  };

  const handleWeightmentUpdate = async (row) => {
    const payload = {};
    if (loadedWeights[row.id]) payload.loaded_weight_mt = parseFloat(loadedWeights[row.id]);
    if (weightmentSlipFiles[row.id]) payload.weightment_slip_file_id = weightmentSlipFiles[row.id];
    if (!payload.loaded_weight_mt && !payload.weightment_slip_file_id) return;
    try {
      await pickupApi.updateWeightment(row.id, payload);
      toast.success("Weightment updated");
      setLoadedWeights((prev) => { const n = { ...prev }; delete n[row.id]; return n; });
      setWeightmentSlipFiles((prev) => { const n = { ...prev }; delete n[row.id]; return n; });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update weightment");
    }
  };

  const handleFinalVerify = async () => {
    if (!confirmRow) return;
    if (!canVerify) { toast.error("No permission"); setConfirmDialogOpen(false); return; }
    try {
      const poId = selectedPO[confirmRow.id];
      const po = purchaseOrders.find(p => String(p.id) === String(poId));

      await pickupApi.finalVerify(confirmRow.id, {
        status: "final_verified",
        purchase_order_id: po?.id,
        purchase_order_no: po?.po_number,
        purchase_order_company_name: po?.to_company_name,
        po_number: po?.client_po_number || po?.po_number,
        po_date: po?.client_po_date || po?.po_date,
        product_id: po?.product_id,
        product_name: po?.product_name,
        depot_id: po?.depot_id,
        depot_name: po?.depot_name,
        company_name: confirmRow.company_name,
        transporter_name: confirmRow.transporter_name,
        loaded_weight_mt: loadedWeights[confirmRow.id] || confirmRow.loaded_weight_mt
      });
      toast.success("Final verification done");
      setFinalVerifiedRows((prev) => ({ ...prev, [confirmRow.id]: true }));
      setConfirmDialogOpen(false);
      setConfirmRow(null);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Final verification failed");
      setConfirmDialogOpen(false);
    }
  };

  const uniqueTransporters = [
    ...new Set(data.map(d => d.transporter_name).filter(Boolean))
  ];

  const uniqueCompanies = [
    ...new Set(
      data.map(d =>
        d.purchase_order_company_name ||
        d.company_name ||
        purchaseOrders.find(p => String(p.id) === String(d.purchase_order_id))?.to_company_name
      ).filter(Boolean)
    )
  ];

  const uniqueDepots = depots.map(d => ({ id: d.id, name: d.name }));

  const accessibleDepotIds = !myDepots || myDepots.has_all_access
    ? null : (myDepots.assigned_depot_ids || []);

  const accessibleProductIds = !myProducts || myProducts.has_all_access
    ? null : (myProducts.assigned_product_ids || []);

  const columns = [
    {
      key: "truck_number",
      label: "Truck",
      render: (v) => <span className="mono font-medium">{v}</span>
    },
    {
      key: "date",
      label: "Date",
      render: (v) => v ? new Date(v).toLocaleDateString("en-GB") : "-"
    },
    {
      key: "transporter_name",
      label: "Transporter",
      render: (v, row) => {
        if (row.status !== "weightment_done") return v || "-";
        return (
          <div className="flex gap-2 items-center min-w-[280px]">
            <Select
              value={editingTransporter[row.id] ?? row.transporter_name ?? ""}
              onValueChange={(v) => setEditingTransporter({ ...editingTransporter, [row.id]: v })}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Transporter" />
              </SelectTrigger>
              <SelectContent>
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const transporter = transporters.find(t => t.name === (editingTransporter[row.id] || row.transporter_name));
                await pickupApi.updateTransporter(row.id, {
                  transporter_name: transporter?.name || editingTransporter[row.id] || row.transporter_name,
                  transporter_id: transporter?.id || row.transporter_id
                });
                toast.success("Transporter updated");
                fetchData();
              } catch (err) {
                toast.error(err?.response?.data?.detail || "Failed to update transporter");
              }
            }}>Save</Button>
          </div>
        );
      }
    },
    {
      key: "company_name",
      label: "Company",
      render: (v, row) => {
        if (row.status !== "weightment_done") return v || "-";
        return (
          <div className="flex gap-2 items-center min-w-[280px]">
            <Select
              value={editingCompany[row.id] ?? row.company_name ?? ""}
              onValueChange={(v) => setEditingCompany({ ...editingCompany, [row.id]: v })}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                await pickupApi.updateCompany(row.id, { company_name: editingCompany[row.id] || row.company_name });
                toast.success("Company updated");
                fetchData();
              } catch (err) {
                toast.error(err?.response?.data?.detail || "Failed to update company");
              }
            }}>Save</Button>
          </div>
        );
      }
    },
    {
      key: "estimated_weight_mt",
      label: "Estimated WT",
      render: (v) => v ? `${Number(v).toFixed(2)} MT` : "-"
    },
    { key: "driver_phone", label: "Driver" },
    {
      key: "status",
      label: "Status",
      render: (v) => {
        const colors = {
          scheduled: "bg-slate-100 text-slate-700 border-l-4 border-slate-400",
          loading_started: "bg-amber-100 text-amber-800 border-l-4 border-amber-500",
          loaded: "bg-emerald-100 text-emerald-800 border-l-4 border-emerald-500",
          weightment_done: "bg-purple-100 text-purple-800 border-l-4 border-purple-500",
          final_verified: "bg-blue-100 text-blue-800 border-l-4 border-blue-500",
          rescheduled: "bg-orange-100 text-orange-800 border-l-4 border-orange-500",
          rejected: "bg-red-100 text-red-800 border-l-4 border-red-500",
          verified: "bg-blue-100 text-blue-800 border-l-4 border-blue-500"
        };
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded inline-block ${colors[v] || ""}`}>
            {v?.replace(/_/g, " ")}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => {
        const isFinalVerified = finalVerifiedRows[row.id];

        const getFormattedPoInfo = (poId) => {
          const po = purchaseOrders.find(p => String(p.id) === String(poId));
          if (!po) return "";
          const totalQty = po.total_quantity_mt ? `${Number(po.total_quantity_mt).toFixed(2)} MT` : "-";
          const poDate = po.client_po_date || po.po_date
            ? new Date(po.client_po_date || po.po_date).toLocaleDateString("en-GB") : "-";
          const prefix = po.client_po_number ? `${po.client_po_number} | ` : "";
          return ` (${prefix}${totalQty} | Dated: ${poDate})`;
        };

        if (isFinalVerified) {
          return (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700 font-semibold">Verified</span>
            </div>
          );
        }

        if (row.status === "weightment_done") {
          return (
            <div className="flex flex-col gap-2 min-w-[350px]">
              {/* PO SELECT */}
              <Select
                value={selectedPO[row.id] || ""}
                onValueChange={(v) => {
                  setSelectedPO({ ...selectedPO, [row.id]: v });
                  const po = purchaseOrders.find(p => String(p.id) === String(v));
                  const w = Number(loadedWeights[row.id] || row.loaded_weight_mt || 0);
                  const available = getAvailableInventory(po?.depot_id, po?.product_id);
                  if (po && w > available) {
                    setInputErrors({ ...inputErrors, [row.id]: `Kindly add inventory STOCK IN to proceed. Depot available: ${available.toFixed(2)} MT.` });
                  } else {
                    const next = { ...inputErrors };
                    delete next[row.id];
                    setInputErrors(next);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders
                    .filter(po => {
                      if (po.status === 'Completed') return false;
                      const pickupCompany = (row.company_name || "").trim().toLowerCase();
                      const poCompany = (po.to_company_name || "").trim().toLowerCase();
                      return pickupCompany === poCompany;
                    })
                    .map((po) => {
                      const totalQty = po.total_quantity_mt ? `${Number(po.total_quantity_mt).toFixed(2)} MT` : "-";
                      const poDate = po.client_po_date || po.po_date
                        ? new Date(po.client_po_date || po.po_date).toLocaleDateString("en-GB") : "-";
                      return (
                        <SelectItem key={po.id} value={po.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-blue-600">
                              {po.client_po_number || po.po_number} <span className="text-xs font-normal text-blue-500">({totalQty} | Dated: {poDate})</span>
                            </span>
                            <span className="text-[11px] text-gray-500 mt-0.5">
                              {po.product_name} • {po.depot_name} • {po.to_company_name || "Unknown"} • Remaining: {(po.remaining_quantity_mt || 0).toFixed(2)} MT
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>

              {/* LOADED WEIGHT */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Loaded Wt (MT)"
                  type="number"
                  disabled
                  className="w-[130px] h-9 text-xs"
                  defaultValue={row.loaded_weight_mt || ""}
                  // onChange={(e) => setLoadedWeights((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />

                {/* TARE SLIP */}
                {row.tare_slip_file_id ? (
                  <Button size="sm" variant="outline" onClick={() => window.open(getFileUrl(row.tare_slip_file_id), '_blank')}>
                    <Eye className="w-4 h-4 mr-1" /> Tare Slip
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={true}>
                    <FileX className="w-4 h-4 mr-1" /> No Tare Slip
                  </Button>
                )}

                {/* WEIGHTMENT SLIP */}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  className="hidden"
                  id={`fdv-wt-slip-${row.id}`}
                  onChange={(e) => handleWeightmentSlipUpload(row.id, e.target.files?.[0])}
                />
                {row.weightment_slip_file_id || weightmentSlipFiles[row.id] ? (
                  <Button size="sm" variant="outline" onClick={() => window.open(getFileUrl(weightmentSlipFiles[row.id] || row.weightment_slip_file_id), "_blank")}>
                    <Eye className="w-4 h-4 mr-1" /> Wt. Slip
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={uploadingWeightment[row.id]} onClick={() => document.getElementById(`fdv-wt-slip-${row.id}`)?.click()}>
                    {uploadingWeightment[row.id] ? "Uploading..." : "Upload Wt. Slip"}
                  </Button>
                )}

                {/* <Button size="sm" variant="outline" onClick={() => handleWeightmentUpdate(row)}>
                  Save Wt.
                </Button> */}
              </div>

              {inputErrors[row.id] && (
                <div className="text-xs text-red-600">{inputErrors[row.id]}</div>
              )}

              {/* FINAL VERIFY */}
              <Button
                size="sm"
                onClick={() => { setConfirmRow(row); setConfirmDialogOpen(true); }}
                disabled={!selectedPO[row.id] || !canVerify}
              >
                Final Verify
              </Button>
            </div>
          );
        }

        return "-";
      }
    },
  ];

  const filteredData = data.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (transporterFilter !== "all" && row.transporter_name !== transporterFilter) return false;

    const companyName = row.purchase_order_company_name || row.company_name ||
      purchaseOrders.find(p => String(p.id) === String(row.purchase_order_id))?.to_company_name;
    if (companyFilter !== "all" && companyName !== companyFilter) return false;
    if (depotFilter !== "all" && String(row.depot_id) !== String(depotFilter)) return false;

    if (depotFilter === "all" && accessibleDepotIds && !accessibleDepotIds.includes(row.depot_id)) return false;
    if (accessibleProductIds && row.product_id && !accessibleProductIds.includes(row.product_id)) return false;

    return true;
  });

  const statusPriority = {
    weightment_done: 1,
    final_verified: 2,
  };

  const sortedData = [...filteredData].sort((a, b) => {
    const pa = statusPriority[a.status] || 99;
    const pb = statusPriority[b.status] || 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  const stats = {
    total: filteredData.length,
    weightment_done: filteredData.filter(d => d.status === "weightment_done").length,
    final_verified: filteredData.filter(d => d.status === "final_verified").length,
  };

  if (!canView) {
    return (
      <PageLayout title="Final Dispatch Verification">
        <div className="p-8 text-center text-gray-500">No permission</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Final Dispatch Verification" subtitle="Final verification with PO selection and dispatch confirmation">
      <FilterPanel
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        transporterFilter={transporterFilter}
        setTransporterFilter={setTransporterFilter}
        companyFilter={companyFilter}
        setCompanyFilter={setCompanyFilter}
        depotFilter={depotFilter}
        setDepotFilter={setDepotFilter}
        uniqueTransporters={uniqueTransporters}
        uniqueCompanies={uniqueCompanies}
        uniqueDepots={uniqueDepots}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button type="button" onClick={() => setStatusFilter("all")}
          className={`w-full rounded-xl border p-0 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusFilter === "all" ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
          <Card className="border-0 bg-transparent shadow-none rounded-none">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
        </button>
        <button type="button" onClick={() => setStatusFilter("weightment_done")}
          className={`w-full rounded-xl border p-0 transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${statusFilter === "weightment_done" ? "border-purple-600 bg-purple-100" : "border-slate-200 bg-purple-50/50 hover:border-purple-400 hover:bg-purple-100"}`}>
          <Card className="border-0 bg-transparent shadow-none rounded-none">
            <CardContent className="pt-5">
              <p className="text-xs text-purple-600">Weightment Done</p>
              <p className="text-2xl font-bold text-purple-700">{stats.weightment_done}</p>
            </CardContent>
          </Card>
        </button>
        <button type="button" onClick={() => setStatusFilter("final_verified")}
          className={`w-full rounded-xl border p-0 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusFilter === "final_verified" ? "border-blue-600 bg-blue-100" : "border-slate-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-100"}`}>
          <Card className="border-0 bg-transparent shadow-none rounded-none">
            <CardContent className="pt-5">
              <p className="text-xs text-blue-600">Final Verified</p>
              <p className="text-2xl font-bold text-blue-700">{stats.final_verified}</p>
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <Input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} className="pl-8" aria-label="Start date" />
        </div>
        <span className="text-sm font-medium text-gray-500">to</span>
        <div className="relative">
          <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <Input type="date" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} className="pl-8" aria-label="End date" />
        </div>
      </div>

      <VerifyPickupOrdersDataTable
        columns={columns}
        data={sortedData}
        loading={loading}
        emptyMessage="No weightment done entries found"
      />

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Final Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
              <div className="font-semibold text-slate-800">Are you sure?</div>
              <div className="text-slate-600">Truck: <strong>{confirmRow?.truck_number || "-"}</strong></div>
              <div className="text-slate-600">Transporter: <strong>{confirmRow?.transporter_name || "-"}</strong></div>
              <div className="text-slate-600">Company: <strong>{confirmRow?.company_name || "-"}</strong></div>
              <div className="text-slate-600">
                PO: <strong>{purchaseOrders.find(p => String(p.id) === String(selectedPO[confirmRow?.id]))?.client_po_number || confirmRow?.purchase_order_no || "-"}</strong>
              </div>
              <div className="text-slate-600">Loaded Weight: <strong>{loadedWeights[confirmRow?.id] || confirmRow?.loaded_weight_mt || "-"} MT</strong></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFinalVerify}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}