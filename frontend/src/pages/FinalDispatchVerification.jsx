import { useState, useEffect } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { pickupApi, purchaseOrdersApi, depotInventoryApi, companyInventoryApi, getFileUrl, transportersApi, companiesApi, depotsApi, uploadFile } from "../lib/api";
import { MultiPhotoUpload } from "../components/shared/FileUpload";
import { usePermissions } from "../lib/permissions";
import { toast } from "sonner";
import { Calendar, Eye, CheckCircle2, Check, X, History, ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [uploadingTare, setUploadingTare] = useState({});
  const [tareSlipFiles, setTareSlipFiles] = useState({});

  const [inputErrors, setInputErrors] = useState({});

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState({});
  const [depotInventory, setDepotInventory] = useState([]);
  const [companyInventory, setCompanyInventory] = useState([]);
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
        companyInventoryRes,
        transporterRes,
        companiesRes,
        depotsRes
      ] = await Promise.all([
        pickupApi.getAll({ start_date: startDate, end_date: endDate }),
        purchaseOrdersApi.getAll(),
        depotInventoryApi.getAll(),
        companyInventoryApi.getAll(),
        transportersApi.getAll(),
        companiesApi.getAll(),
        depotsApi.getAll()
      ]);

      setPurchaseOrders(poRes.data || []);
      setDepotInventory(depotInventoryRes.data || []);
      setCompanyInventory(companyInventoryRes.data || []);
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
  }, [startDate, endDate, statusFilter]);

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

  const getAvailableInventory = (sourceType, sourceId, productId) => {
    if (sourceType === "Company") {
      const inventory = companyInventory.find(
        (item) => item.company_id === sourceId && item.product_id === productId
      );
      return Number(inventory?.available_quantity || 0);
    } else {
      const inventory = depotInventory.find(
        (item) => item.depot_id === sourceId && item.product_id === productId
      );
      return Number(inventory?.available_quantity || 0);
    }
  };

  const getStockMessage = (sourceType, available) => {
    if (sourceType === "Company") {
      return `Kindly add inventory STOCK IN to proceed. Company available: ${available.toFixed(2)} MT.`;
    }
    return `Kindly add inventory STOCK IN to proceed. Depot available: ${available.toFixed(2)} MT.`;
  };

  const handleWeightmentSlipUpload = async (pickupId, file) => {
    if (!file) return;
    setUploadingWeightment((prev) => ({ ...prev, [pickupId]: true }));
    try {
      const result = await uploadFile(file);
      await pickupApi.uploadWeightmentSlip(pickupId, { weightment_slip_file_id: result.file_id });
      setWeightmentSlipFiles((prev) => ({ ...prev, [pickupId]: result.file_id }));
      toast.success("Weightment slip uploaded and saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to upload weightment slip");
    } finally {
      setUploadingWeightment((prev) => ({ ...prev, [pickupId]: false }));
    }
  };

  const handleTareSlipUpload = async (pickupId, file) => {
    if (!file) return;
    setUploadingTare((prev) => ({ ...prev, [pickupId]: true }));
    try {
      const result = await uploadFile(file);
      await pickupApi.uploadTareSlip(pickupId, { tare_slip_file_id: result.file_id });
      setTareSlipFiles((prev) => ({ ...prev, [pickupId]: result.file_id }));
      toast.success("Tare slip uploaded");
    } catch {
      toast.error("Failed to upload tare slip");
    } finally {
      setUploadingTare((prev) => ({ ...prev, [pickupId]: false }));
    }
  };

  const handleLoadedWeightChange = async (row, value) => {
    setLoadedWeights((prev) => ({ ...prev, [row.id]: value }));
    const w = Number(value || 0);
    const poId = selectedPO[row.id];
    const po = purchaseOrders.find(p => String(p.id) === String(poId));
    const available = getAvailableInventory(po?.source_type, po?.depot_id, po?.product_id);
    setInputErrors((prevErrors) => {
      const next = { ...prevErrors };
      if (po && w > available) {
        next[row.id] = getStockMessage(po?.source_type, available);
      } else {
        delete next[row.id];
      }
      return next;
    });
    if (!value) return;
    try {
      await pickupApi.updateWeightment(row.id, { loaded_weight_mt: parseFloat(value) });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update weight");
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
        source_id: confirmRow.source_id,
        source_name: confirmRow.source_name,
        source_type: confirmRow.source_type,
        company_name: confirmRow.company_name,
        transporter_name: confirmRow.transporter_name,
        loaded_weight_mt: loadedWeights[confirmRow.id] || confirmRow.loaded_weight_mt,
        tare_slip_file_id: tareSlipFiles[confirmRow.id] || confirmRow.tare_slip_file_id,
        weightment_slip_file_id: weightmentSlipFiles[confirmRow.id] || confirmRow.weightment_slip_file_id
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

  const poCompanies = [
    ...new Set(
      purchaseOrders.map(po =>
        po.source_type === "Company" ? po.depot_name : po.to_company_name
      ).filter(Boolean)
    )
  ];

  const allCompanies = [...uniqueCompanies, ...poCompanies].filter((v, i, a) => a.indexOf(v) === i);

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
      key: "source_name",
      label: "Source",
      render: (v, row) => {
        const sourceId = row.source_id || row.depot_id;
        if (!sourceId) return "-";
        const depot = depots.find(d => String(d.id) === String(sourceId));
        return <span className="text-sm">{depot?.name || row.source_name || row.depot_name || "-"}</span>;
      }
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
    {
      key: "driver_phone", label: "Driver"
    },


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
      key: "loaded_weight_mt",
      label: "Final Weight",
      render: (v, row) => {
        if (row.status !== "final_verified") return "-";
        return v ? `${Number(v).toFixed(2)} MT` : "-";
      }
    },
    {
      key: "weightment_slip_file_id",
      label: "Weight Slip",
      render: (v, row) => {
        if (row.status !== "final_verified") return "-";
        if (!v) return <span className="text-gray-400">-</span>;
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(getFileUrl(v), '_blank')}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
      }
    },
    {
      key: "tare_slip_file_id",
      label: "Tare Slip",
      render: (v, row) => {
        if (row.status !== "final_verified") return "-";
        if (!v) return <span className="text-gray-400">-</span>;
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(getFileUrl(v), '_blank')}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
      }
    },


    // ------------------ history
    {
      key: "tare_slip_history",
      label: "Tare Slip History",
      render: (v, row) => {
        const history = row.tare_slip_upload_history || [];
        const latestFileId = row.tare_slip_file_id;

        if (history.length === 0 && !latestFileId) {
          return <span className="text-gray-400">-</span>;
        }

        return (
          <div className="space-y-1">
            {latestFileId && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">Latest:</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1"
                  onClick={() => window.open(getFileUrl(latestFileId), '_blank')}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            )}

            {history.length > 0 && (
              <Collapsible className="text-xs">
                <CollapsibleTrigger className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                  <History className="w-3 h-3" />
                  <span>{history.length} upload{history.length > 1 ? 's' : ''}</span>
                  <ChevronDown className="w-3 h-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                    {history.slice(0).reverse().map((entry, idx) => (
                      <div key={idx} className="border-l-2 border-gray-200 pl-2 py-1 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.uploaded_by_name || 'Unknown'}</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-500">{new Date(entry.uploaded_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1 mt-1"
                          onClick={() => window.open(getFileUrl(entry.file_id), '_blank')}
                        >
                          <Eye className="w-2 h-2 mr-1" />
                          View Slip
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {!latestFileId && <span className="text-gray-400 text-xs">No file</span>}
          </div>
        );
      }
    },
    {
      key: "weightment_slip_history",
      label: "Weightment Slip History",
      render: (v, row) => {
        const history = row.weightment_slip_upload_history || [];
        const latestFileId = row.weightment_slip_file_id;

        if (history.length === 0 && !latestFileId) {
          return <span className="text-gray-400">-</span>;
        }

        return (
          <div className="space-y-1">
            {latestFileId && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 font-medium">Latest:</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1"
                  onClick={() => window.open(getFileUrl(latestFileId), '_blank')}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            )}

            {history.length > 0 && (
              <Collapsible className="text-xs">
                <CollapsibleTrigger className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                  <History className="w-3 h-3" />
                  <span>{history.length} upload{history.length > 1 ? 's' : ''}</span>
                  <ChevronDown className="w-3 h-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                    {history.slice(0).reverse().map((entry, idx) => (
                      <div key={idx} className="border-l-2 border-gray-200 pl-2 py-1 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.uploaded_by_name || 'Unknown'}</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-500">{new Date(entry.uploaded_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1 mt-1"
                          onClick={() => window.open(getFileUrl(entry.file_id), '_blank')}
                        >
                          <Eye className="w-2 h-2 mr-1" />
                          View Slip
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {!latestFileId && <span className="text-gray-400 text-xs">No file</span>}
          </div>
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
                  const available = getAvailableInventory(po?.source_type, po?.depot_id, po?.product_id);
                  setInputErrors((prevErrors) => {
                    const next = { ...prevErrors };
                    if (po && w > available) {
                      next[row.id] = getStockMessage(po?.source_type, available);
                    } else {
                      delete next[row.id];
                    }
                    return next;
                  });
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
                      const poCompany = po.to_company_name;
                      const matchesCompany = pickupCompany === (poCompany || "").trim().toLowerCase();
                      const hasDepotId = !!po.depot_id;
                      return matchesCompany && hasDepotId;
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
                              {po.product_name} • {po.depot_name || "Unknown"} • Remaining: {(po.remaining_quantity_mt || 0).toFixed(2)} MT
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
              </Select>

              {/* LOADED WEIGHT - EDITABLE */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Loaded Wt (MT)"
                  type="number"
                  className="w-[130px] h-9 text-xs"
                  value={loadedWeights[row.id] ?? row.loaded_weight_mt ?? ""}
                  onChange={(e) => { handleLoadedWeightChange(row, e.target.value); }}
                />

                {/* TARE SLIP - UPLOAD/EDIT */}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  className="hidden"
                  id={`fdv-tare-slip-${row.id}`}
                  onChange={(e) => handleTareSlipUpload(row.id, e.target.files?.[0])}
                />
                {tareSlipFiles[row.id] || row.tare_slip_file_id ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => window.open(getFileUrl(tareSlipFiles[row.id] || row.tare_slip_file_id), '_blank')}>
                      <Eye className="w-4 h-4 mr-1" /> Tare Slip
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => document.getElementById(`fdv-tare-slip-${row.id}`)?.click()}>
                      Edit
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" disabled={uploadingTare[row.id]} onClick={() => document.getElementById(`fdv-tare-slip-${row.id}`)?.click()}>
                    {uploadingTare[row.id] ? "Uploading..." : "Upload Tare Slip"}
                  </Button>
                )}

                {/* WEIGHTMENT SLIP - UPLOAD/EDIT */}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  className="hidden"
                  id={`fdv-wt-slip-${row.id}`}
                  onChange={(e) => handleWeightmentSlipUpload(row.id, e.target.files?.[0])}
                />
                {weightmentSlipFiles[row.id] || row.weightment_slip_file_id ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => window.open(getFileUrl(weightmentSlipFiles[row.id] || row.weightment_slip_file_id), "_blank")}>
                      <Eye className="w-4 h-4 mr-1" /> Wt. Slip
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => document.getElementById(`fdv-wt-slip-${row.id}`)?.click()}>
                      Edit
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" disabled={uploadingWeightment[row.id]} onClick={() => document.getElementById(`fdv-wt-slip-${row.id}`)?.click()}>
                    {uploadingWeightment[row.id] ? "Uploading..." : "Upload Wt. Slip"}
                  </Button>
                )}
              </div>

              {inputErrors[row.id] && (
                <div className="text-xs text-red-600">{inputErrors[row.id]}</div>
              )}

              {/* FINAL VERIFY */}
              <Button
                size="sm"
                onClick={() => { setConfirmRow(row); setConfirmDialogOpen(true); }}
                disabled={!selectedPO[row.id] || !canVerify || !!inputErrors[row.id]}
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
    // When filtering by 'verified' or 'final_verified', show both statuses
    if (statusFilter !== "all" && statusFilter !== "verified" && statusFilter !== "final_verified") {
      if (row.status !== statusFilter) return false;
    }
    if (statusFilter === "verified" && row.status !== "verified" && row.status !== "final_verified") return false;
    if (statusFilter === "final_verified" && row.status !== "final_verified") return false;

    if (transporterFilter !== "all" && row.transporter_name !== transporterFilter) return false;

    const companyName = row.purchase_order_company_name || row.company_name ||
      purchaseOrders.find(p => String(p.id) === String(row.purchase_order_id))?.to_company_name;
    if (companyFilter !== "all" && companyName !== companyFilter) return false;

    const rowDepotId = row.depot_id || row.source_id;
    if (depotFilter !== "all" && String(rowDepotId) !== String(depotFilter)) return false;

    if (depotFilter === "all" && accessibleDepotIds && rowDepotId && !accessibleDepotIds.includes(rowDepotId)) return false;
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
    weightment_done: data.filter(d => d.status === "weightment_done").length,
    final_verified: data.filter(d => d.status === "final_verified").length,
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
        uniqueCompanies={allCompanies}
        uniqueDepots={uniqueDepots}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        emptyMessage={`No ${statusFilter === "weightment_done" ? "weightment done" : statusFilter === "final_verified" ? "final verified" : "entries"} entries found`}
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
                PO: <strong>{purchaseOrders.find(p => String(p.id) === String(selectedPO[confirmRow?.id]))?.client_po_number || purchaseOrders.find(p => String(p.id) === String(selectedPO[confirmRow?.id]))?.po_number || confirmRow?.purchase_order_no || "-"}</strong>
              </div>
              <div className="text-slate-600">Loaded Weight: <strong>{loadedWeights[confirmRow?.id] || confirmRow?.loaded_weight_mt || "-"} MT</strong></div>
              {(() => {
                const po = purchaseOrders.find(p => String(p.id) === String(selectedPO[confirmRow?.id]));
                const loadedWt = Number(loadedWeights[confirmRow?.id] || confirmRow?.loaded_weight_mt || 0);
                const estWt = Number(confirmRow?.estimated_weight_mt || 0);
                const diff = loadedWt - estWt;
                return (
                  <>
                    <div className="text-slate-600">Est. Weight: <strong>{estWt ? estWt.toFixed(2) : "-"} MT</strong></div>
                    <div className="text-slate-600">Diff (Loaded Wt. - Est. Wt.): <strong className={diff >= 0 ? "text-emerald-600" : "text-red-600"}>{diff ? diff.toFixed(2) : "-"} MT</strong></div>
                  </>
                );
              })()}
              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Weightment Slip:</span>
                  {(weightmentSlipFiles[confirmRow?.id] || confirmRow?.weightment_slip_file_id) ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Tare Slip:</span>
                  {(tareSlipFiles[confirmRow?.id] || confirmRow?.tare_slip_file_id) ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              {/* {confirmRow?.tare_slip_upload_history && confirmRow.tare_slip_upload_history.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-slate-500 mb-1">Tare Slip Upload History:</div>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                    {confirmRow.tare_slip_upload_history.slice(-3).reverse().map((entry, idx) => (
                      <div key={idx} className="text-xs flex justify-between items-center py-1 border-b last:border-0">
                        <div>
                          <span className="font-medium">{entry.uploaded_by_name || 'Unknown'}</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-500">{new Date(entry.uploaded_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1"
                          onClick={() => window.open(getFileUrl(entry.file_id), '_blank')}
                        >
                          <Eye className="w-2 h-2 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
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