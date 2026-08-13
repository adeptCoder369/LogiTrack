import { useState, useEffect, useRef } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { TrucksDataTable } from "../components/trucks/DataTable";
import { FormModal } from "../components/shared/FormModal";
import { DeleteDialog } from "../components/shared/DeleteDialog";
import { StatusBadge } from "../components/shared/StatusBadge";
import {
  FileUpload,
  MultiPhotoUpload,
  DualFileUpload,
  PhotoUpload,
} from "../components/shared/FileUpload";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { trucksApi, transportersApi, importApi, getFileUrl } from "../lib/api";
import { validators, formatters } from "../lib/validation";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  Download,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  Eye,
} from "lucide-react";
import { Can } from "../components/Can";
import { usePermissions } from "../lib/permissions";
import { useAuth } from "../lib/auth";

// Helper to format vehicle number for display
const formatVehicleNumber = (value) => formatters.vehicleNumberDisplay(value);

export default function Trucks() {
  const { hasActionPermission } = usePermissions();
  const { user: currentUser } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Vehicle number search state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_number: "",
    transporter_id: "",
    capacity_mt: "",
    tare_weight_mt: "",
    insurance_expiry: "",
    puc_expiry: "",
    driver_name: "",
    driver_mobile: "",
    helper1_name: "",
    helper1_mobile: "",
    helper2_name: "",
    helper2_mobile: "",
    current_status: "Idle",
    photos: [],
    fitness_certificate: { front: null, back: null },
    fitness_valid_upto: "",
    insurance: { front: null, back: null },
    insurance_valid_upto: "",
    tax: { front: null, back: null },
    tax_valid_upto: "",
    pollution: { front: null, back: null },
    pollution_valid_upto: "",
rc: { front: null, back: null },
     registration_date: "",
    m_parivaahan: null,
    driver_license: { front: null, back: null },
    driver_photo: null,
    driver_aadhaar: { front: null, back: null },
    helper1_aadhaar: { front: null, back: null },
    helper1_photo: null,
    helper2_aadhaar: { front: null, back: null },
    helper2_photo: null,
  });
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const renderDocumentStatus = (docValue, docLabel = "Document") => {
    const handleDownload = (fileId, label) => {
      // Extract original filename from file_id (format: prefix_originalname.ext)
      const originalName = fileId?.includes('_') ? fileId.split('_').slice(1).join('_') : fileId;
      const link = document.createElement("a");
      link.href = getFileUrl(fileId);
      link.download = originalName || `${docLabel}-${label}`;
      link.target = "_blank";
      link.click();
    };

    if (!docValue) {
      return (
        <div className="flex flex-col items-center gap-1">
          <X className="w-4 h-4 text-red-500" />
        </div>
      );
    }

    if (typeof docValue === "object") {
      const hasFile = docValue.front || docValue.back;
      if (!hasFile) {
        return (
          <div className="flex flex-col items-center gap-1">
            <X className="w-4 h-4 text-red-500" />
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <div className="flex gap-1">
            {docValue.front && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    window.open(getFileUrl(docValue.front), "_blank")
                  }
                  title="View Front"
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDownload(docValue.front, "Front")}
                  title="Download Front"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </>
            )}
            {docValue.back && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    window.open(getFileUrl(docValue.back), "_blank")
                  }
                  title="View Back"
                >
                  <Eye className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDownload(docValue.back, "Back")}
                  title="Download Back"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <CheckCircle className="w-4 h-4 text-green-600" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => window.open(getFileUrl(docValue), "_blank")}
            title="View"
          >
            <Eye className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleDownload(docValue, docLabel)}
            title="Download"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDocumentLink = (fileId, label, docType) => {
    if (!fileId) return null;
    return (
      <div className="flex gap-2">
        <a
          href={getFileUrl(fileId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs"
        >
          {label}
        </a>
        <a
          href={getFileUrl(fileId)}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="text-gray-600 hover:text-gray-800 text-xs"
          title={`Download ${label}`}
        >
          <Download className="w-3 h-3 inline" />
        </a>
      </div>
    );
  };

  const renderDocumentsInModal = (docValue, docType) => {
    if (!docValue) return null;

    if (typeof docValue === "object") {
      return (
        <div className="flex gap-2">
          {docValue.front &&
            renderDocumentLink(docValue.front, "Front", docType)}
          {docValue.back && renderDocumentLink(docValue.back, "Back", docType)}
        </div>
      );
    }
    return renderDocumentLink(docValue, "View", docType);
  };

  const documentColumns = [
    {
      key: "fitness_certificate",
      label: "Fitness",
      render: (v) => renderDocumentStatus(v, "Fitness"),
    },
    {
      key: "insurance",
      label: "Insurance",
      render: (v) => renderDocumentStatus(v, "Insurance"),
    },
    {
      key: "tax",
      label: "Tax",
      render: (v) => renderDocumentStatus(v, "Tax"),
    },
    {
      key: "pollution",
      label: "Pollution",
      render: (v) => renderDocumentStatus(v, "Pollution"),
    },
    {
      key: "rc",
      label: "RC",
      render: (v) => renderDocumentStatus(v, "RC"),
    },
  ];

  const helperColumns = [
    {
      key: "helper1_name",
      label: "Helper 1",
      render: (v, row) =>
        v
          ? `${v}${row?.helper1_mobile ? ` (${row.helper1_mobile})` : ""}`
          : "-",
    },
    //    { key: 'helper2_name', label: 'Helper 2', render: (v, row) => v ? `${v}${row?.helper2_mobile ? ` (${row.helper2_mobile})` : ''}` : '-' },
  ];

  const columns = [
    {
      key: "vehicle_number",
      label: "Vehicle No.",
      render: (v) => (
        <span className="mono font-medium tracking-wider">
          {formatVehicleNumber(v)}
        </span>
      ),
    },

    {
      key: "transporter_name",
      label: "Transporter",
      render: (v, row) => {
        const transporter = transporters.find(
          (t) => t.id === row.transporter_id,
        );
        return transporter?.name || "-";
      },
    },

    // {
    //   key: 'drivers',
    //   label: 'Driver',
    //   render: (v, row) => {
    //     const drivers = v || [];
    //     const primary = drivers.find(d => d.is_primary) || {};
    //     return (
    //       <div className="text-sm">
    //         <p className="font-medium">{primary.name || row.driver_name || '-'}</p>
    //         {primary.mobile && (
    //           <p className="text-xs text-gray-500">{primary.mobile}</p>
    //         )}
    //       </div>
    //     );
    //   }
    // },

    // {
    //   key: "driver_mobile",
    //   label: "Driver Mobile",
    //   render: (v, row) => {
    //     const primary = (row.drivers || []).find(d => d.is_primary);

    //     const mobile = primary?.mobile || row.driver_mobile;

    //     if (!mobile) return "-";

    //     return (
    //       <a
    //         href={`tel:${mobile}`}
    //         className="text-blue-600 hover:underline"
    //       >
    //         {mobile}
    //       </a>
    //     );
    //   }
    // },

    //    {
    //      key: 'year_of_manufacture',
    //      label: 'Year',
    //      render: (v) => v || '-'
    //    },
    //
    //    { key: 'capacity_mt', label: 'Capacity (MT)', render: (v) => v ? `${v} MT` : '-' },
    //    { key: 'tare_weight_mt', label: 'Tare Weight', render: (v) => v ? `${v} MT` : '-' },
    //
    //    { key: 'make_model', label: 'Make/Model' },

    {
      key: "personnel_details",
      label: "Driver / Helper",
      render: (_v, row) => {
        const drivers = row.drivers || [];
        const primary = drivers.find((d) => d.is_primary) || {};
        const driverName = primary.name || row.driver_name || "-";
        const driverMobile = primary.mobile || row.driver_mobile || "";
        const driverLicense = row.driver_license || "";
        const driverAadhaar = row.driver_aadhaar || "";
        const driverPhoto = row.driver_photo || "";
        const helperName = row.helper1_name || "";
        const helperMobile = row.helper1_mobile || "";
        const helperAadhaar = row.helper1_aadhaar || "";
        const helperPhoto = row.helper1_photo || "";

        const renderMediaLink = (fileId, label) => {
          if (!fileId) {
            return <span className="text-slate-400">N/A</span>;
          }

          if (typeof fileId === "object") {
            return (
              <div className="flex gap-1">
                {fileId.front && (
                  <a
                    href={getFileUrl(fileId.front)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    title={`Download ${label} Front`}
                  >
                    {label} F
                    <Download className="w-3 h-3" />
                  </a>
                )}
                {fileId.back && (
                  <a
                    href={getFileUrl(fileId.back)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    title={`Download ${label} Back`}
                  >
                    {label} B
                    <Download className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          }

          return (
            <a
              href={getFileUrl(fileId)}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              {label}
              <Download className="w-3 h-3" />
            </a>
          );
        };

        const renderPhotoLink = (fileId, altText) => {
          if (!fileId) {
            return <span className="text-slate-400">N/A</span>;
          }

          if (typeof fileId === "object") {
            return (
              <div className="flex gap-2">
                {fileId.front && (
                  <a
                    href={getFileUrl(fileId.front)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <img
                      src={getFileUrl(fileId.front)}
                      alt={altText}
                      className="h-8 w-8 rounded border object-cover"
                    />
                    <Download className="w-3 h-3 inline" />
                  </a>
                )}
                {fileId.back && (
                  <a
                    href={getFileUrl(fileId.back)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <img
                      src={getFileUrl(fileId.back)}
                      alt={altText}
                      className="h-8 w-8 rounded border object-cover"
                    />
                    <Download className="w-3 h-3 inline" />
                  </a>
                )}
              </div>
            );
          }

          return (
            <a
              href={getFileUrl(fileId)}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-2"
            >
              <img
                src={getFileUrl(fileId)}
                alt={altText}
                className="h-8 w-8 rounded border object-cover"
              />
              <Download className="w-3 h-3" />
            </a>
          );
        };

        return (
          <div className="min-w-[320px] text-sm leading-5">
            <div className="font-medium text-slate-700">
              Driver: {driverName}
              {driverMobile ? (
                <a
                  href={`tel:${driverMobile}`}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  ({driverMobile})
                </a>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-medium">DL:</span>
              {renderMediaLink(driverLicense, "DL")}
              <span className="font-medium">Aadhaar:</span>
              {renderMediaLink(driverAadhaar, "Aadhaar")}
              <span className="font-medium">Photo:</span>
              {renderPhotoLink(driverPhoto, "Driver photo")}
            </div>

            <div className="mt-2 text-slate-600">
              <div className="font-medium text-slate-700">
                Helper: {helperName || "N/A"}
                {helperMobile ? (
                  <a
                    href={`tel:${helperMobile}`}
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    ({helperMobile})
                  </a>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium">Aadhaar:</span>
                {renderMediaLink(helperAadhaar, "Aadhaar")}
                <span className="font-medium">Photo:</span>
                {renderPhotoLink(helperPhoto, "Helper photo")}
              </div>
            </div>
          </div>
        );
      },
    },

    {
      key: "current_status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "Idle"} />,
    },

    ...documentColumns,
    // ...helperColumns,
  ];

  const fetchData = async () => {
    try {
      const [trucksRes, transportersRes] = await Promise.all([
        trucksApi.getAll(),
        transportersApi.getAll(),
      ]);
      setTrucks(trucksRes.data);
      setTransporters(transportersRes.data);

      if (currentUser?.role === "Transporter") {
        setFormData((prev) => ({
          ...prev,
          transporter_id: currentUser?.transporter_id || prev.transporter_id,
        }));
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setVehicleSearch("");
    setVehicleDropdownOpen(false);
    setFormData({
      vehicle_number: "",
      transporter_id: "",
      capacity_mt: "",
      tare_weight_mt: "",
      insurance_expiry: "",
      puc_expiry: "",
      driver_name: "",
      driver_mobile: "",
      helper1_name: "",
      helper1_mobile: "",
      helper2_name: "",
      helper2_mobile: "",
      current_status: "Idle",
      photos: [],
      fitness_certificate: { front: null, back: null },
      fitness_valid_upto: "",
      insurance: { front: null, back: null },
      insurance_valid_upto: "",
      tax: { front: null, back: null },
      tax_valid_upto: "",
      pollution: { front: null, back: null },
      pollution_valid_upto: "",
rc: { front: null, back: null },
       registration_date: "",
      m_parivaahan: null,
      driver_license: { front: null, back: null },
      driver_photo: null,
      driver_aadhaar: { front: null, back: null },
      helper1_aadhaar: { front: null, back: null },
      helper1_photo: null,
      helper2_aadhaar: { front: null, back: null },
      helper2_photo: null,
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setVehicleSearch(item.vehicle_number || "");
    setVehicleDropdownOpen(false);
    let photos = item.photos || [];
    if (!Array.isArray(photos) || photos.length === 0) {
      if (item.front_photo) photos.push(item.front_photo);
      if (item.back_photo) photos.push(item.back_photo);
    }

    const getDocValue = (docValue) => {
      if (!docValue) return { front: null, back: null };
      if (typeof docValue === "string") return { front: docValue, back: null };
      return {
        front: docValue.front || null,
        back: docValue.back || null,
      };
    };

    setFormData({
      vehicle_number: item.vehicle_number || "",
      transporter_id: item.transporter_id || "",
      capacity_mt: item.capacity_mt || "",
      tare_weight_mt: item.tare_weight_mt || "",
      insurance_expiry: item.insurance_expiry || "",
      puc_expiry: item.puc_expiry || "",
      driver_name: item.driver_name || "",
      driver_mobile: item.driver_mobile || "",
      helper1_name: item.helper1_name || "",
      helper1_mobile: item.helper1_mobile || "",
      helper2_name: item.helper2_name || "",
      helper2_mobile: item.helper2_mobile || "",
      current_status: item.current_status || "Idle",
      photos: photos,
      fitness_certificate: getDocValue(item.fitness_certificate),
      fitness_valid_upto: item.fitness_valid_upto || "",
      insurance: getDocValue(item.insurance),
      insurance_valid_upto: item.insurance_valid_upto || "",
      tax: getDocValue(item.tax),
      tax_valid_upto: item.tax_valid_upto || "",
      pollution: getDocValue(item.pollution),
      pollution_valid_upto: item.pollution_valid_upto || "",
rc: getDocValue(item.rc),
       registration_date: item.registration_date || "",
      m_parivaahan: item.m_parivaahan || null,
      driver_license: getDocValue(item.driver_license),
      driver_photo: item.driver_photo || null,
      driver_aadhaar: getDocValue(item.driver_aadhaar),
      helper1_aadhaar: getDocValue(item.helper1_aadhaar),
      helper1_photo: item.helper1_photo || null,
      helper2_aadhaar: getDocValue(item.helper2_aadhaar),
      helper2_photo: item.helper2_photo || null,
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleView = (row) => {
    setViewItem(row);
    setViewOpen(true);
  };

  // Filter trucks based on vehicle search query
  const filteredTrucks = trucks.filter((t) =>
    t.vehicle_number
      ?.toUpperCase()
      .includes(vehicleSearch.toUpperCase().replace(/\s/g, "")),
  );

  // Check if exact match exists (excluding current item being edited)
  const exactMatchExists = trucks.some(
    (t) =>
      t.vehicle_number?.toUpperCase().replace(/\s/g, "") ===
        vehicleSearch.toUpperCase().replace(/\s/g, "") &&
      (!selectedItem || t.id !== selectedItem.id),
  );

  // Check if vehicle number is valid format
  const isValidVehicleFormat =
    vehicleSearch.length >= 6 &&
    /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/i.test(
      vehicleSearch.replace(/\s/g, ""),
    );

  const handleSubmit = async () => {
    // Validation
    const errors = [];

    if (!formData.vehicle_number || !formData.vehicle_number.trim()) {
      errors.push("Vehicle number is required");
    } else {
      const vehicleError = validators.vehicleNumber(
        formData.vehicle_number,
        "Vehicle number",
      );
      if (vehicleError) errors.push(vehicleError);

      // Check for duplicate vehicle number
      if (exactMatchExists) {
        errors.push("This vehicle number already exists");
      }
    }

    if (formData.capacity_mt) {
      const capacityError = validators.positiveNumber(
        formData.capacity_mt,
        "Capacity",
      );
      if (capacityError) errors.push(capacityError);
    }

    if (formData.tare_weight_mt) {
      const tareError = validators.positiveNumber(
        formData.tare_weight_mt,
        "Tare weight",
      );
      if (tareError) errors.push(tareError);
    }

    if (formData.driver_mobile) {
      const mobileError = validators.mobile(
        formData.driver_mobile,
        "Driver mobile",
      );
      if (mobileError) errors.push(mobileError);
    }

    if (formData.helper1_mobile) {
      const helper1Error = validators.mobile(
        formData.helper1_mobile,
        "Helper No. 1 mobile",
      );
      if (helper1Error) errors.push(helper1Error);
    }

    if (formData.helper2_mobile) {
      const helper2Error = validators.mobile(
        formData.helper2_mobile,
        "Helper No. 2 mobile",
      );
      if (helper2Error) errors.push(helper2Error);
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        capacity_mt: formData.capacity_mt
          ? parseFloat(formData.capacity_mt)
          : null,
        tare_weight_mt: formData.tare_weight_mt
          ? parseFloat(formData.tare_weight_mt)
          : null,
        photos: (formData.photos || []).map((p) => p.file_id || p),
        fitness_certificate: formData.fitness_certificate?.front
          ? {
              front:
                formData.fitness_certificate.front.file_id ||
                formData.fitness_certificate.front,
              back:
                formData.fitness_certificate.back?.file_id ||
                formData.fitness_certificate.back ||
                null,
            }
          : null,
        insurance: formData.insurance?.front
          ? {
              front:
                formData.insurance.front.file_id || formData.insurance.front,
              back:
                formData.insurance.back?.file_id ||
                formData.insurance.back ||
                null,
            }
          : null,
        tax: formData.tax?.front
          ? {
              front: formData.tax.front.file_id || formData.tax.front,
              back: formData.tax.back?.file_id || formData.tax.back || null,
            }
          : null,
        pollution: formData.pollution?.front
          ? {
              front:
                formData.pollution.front.file_id || formData.pollution.front,
              back:
                formData.pollution.back?.file_id ||
                formData.pollution.back ||
                null,
            }
          : null,
        rc: formData.rc?.front
          ? {
              front: formData.rc.front.file_id || formData.rc.front,
              back: formData.rc.back?.file_id || formData.rc.back || null,
            }
          : null,
        driver_license: formData.driver_license?.front
          ? {
              front:
                formData.driver_license.front.file_id ||
                formData.driver_license.front,
              back:
                formData.driver_license.back?.file_id ||
                formData.driver_license.back ||
                null,
            }
          : null,
        driver_photo:
          formData.driver_photo?.file_id || formData.driver_photo || null,
        driver_aadhaar: formData.driver_aadhaar?.front
          ? {
              front:
                formData.driver_aadhaar.front.file_id ||
                formData.driver_aadhaar.front,
              back:
                formData.driver_aadhaar.back?.file_id ||
                formData.driver_aadhaar.back ||
                null,
            }
          : null,
        helper1_aadhaar: formData.helper1_aadhaar?.front
          ? {
              front:
                formData.helper1_aadhaar.front.file_id ||
                formData.helper1_aadhaar.front,
              back:
                formData.helper1_aadhaar.back?.file_id ||
                formData.helper1_aadhaar.back ||
                null,
            }
          : null,
        helper1_photo:
          formData.helper1_photo?.file_id || formData.helper1_photo || null,
        helper2_aadhaar: formData.helper2_aadhaar?.front
          ? {
              front:
                formData.helper2_aadhaar.front.file_id ||
                formData.helper2_aadhaar.front,
              back:
                formData.helper2_aadhaar.back?.file_id ||
                formData.helper2_aadhaar.back ||
                null,
            }
          : null,
        helper2_photo:
          formData.helper2_photo?.file_id || formData.helper2_photo || null,
      };
      if (selectedItem) {
        await trucksApi.update(selectedItem.id, payload);
        toast.success("Truck updated successfully");
      } else {
        await trucksApi.create(payload);
        toast.success("Truck created successfully");
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save truck");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await trucksApi.delete(selectedItem.id);
      toast.success("Truck deleted successfully");
      setDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete truck");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(importApi.getTemplate("trucks"), "_blank");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const response = await importApi.bulkImport("trucks", file);
      const { imported, errors, total_errors } = response.data;

      if (imported > 0) {
        toast.success(`Successfully imported ${imported} trucks`);
        fetchData();
      }

      if (total_errors > 0) {
        toast.error(`${total_errors} rows had errors`);
        errors.forEach((err) => console.error(err));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = ""; // Reset file input
    }
  };

  const statusOptions = ["Idle", "On Trip", "Maintenance"];

  return (
    <PageLayout
      title="Trucks"
      subtitle="Manage your fleet"
      actions={
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? "Importing..." : "Import Excel"}
          </Button>
          <Can action="create_truck">
            <Button
              onClick={handleAdd}
              className="bg-slate-900 hover:bg-slate-800"
              data-testid="add-truck-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Truck
            </Button>
          </Can>
        </div>
      }
    >
      <TrucksDataTable
        columns={columns}
        data={trucks}
        loading={loading}
        onEdit={hasActionPermission("update_truck") ? handleEdit : undefined}
        onDelete={
          hasActionPermission("delete_truck") ? handleDelete : undefined
        }
customActions={(row) => (
           <div className="flex gap-4">
             <div className="flex flex-col items-center gap-1">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() =>
                   window.open(trucksApi.downloadDocuments(row.id), "_blank")
                 }
                 title="Download All Documents (PDF)"
               >
                 <Download className="w-4 h-4" />
               </Button>
               <span className="text-xs text-gray-600">
                 Download All Documents
               </span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() =>
                   window.open(trucksApi.downloadDocumentsChecklist(row.id), "_blank")
                 }
                 title="Download Doc Checklist (PDF)"
               >
                 <Download className="w-4 h-4" />
               </Button>
               <span className="text-xs text-gray-600">
                 Download Doc Checklist
               </span>
             </div>
             <Button
               variant="ghost"
               size="sm"
               onClick={() => handleView(row)}
               title="View Details"
             >
               <Eye className="w-4 h-4" />
             </Button>
           </div>
         )}
        emptyMessage="No trucks found. Add your first truck!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? "Edit Truck" : "Add Truck"}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 relative">
            <Label htmlFor="vehicle_number">Vehicle Number *</Label>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="vehicle_number"
                  value={vehicleSearch}
                  onChange={(e) => {
                    const value = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "");
                    setVehicleSearch(value);
                    setFormData({ ...formData, vehicle_number: value });
                    setVehicleDropdownOpen(true);
                  }}
                  onFocus={() => setVehicleDropdownOpen(true)}
                  placeholder="e.g., MH12AB1234"
                  className="pl-9 pr-8 mono tracking-wider"
                  data-testid="truck-number-input"
                />
                {vehicleSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSearch("");
                      setFormData({ ...formData, vehicle_number: "" });
                    }}
                    className="absolute right-2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {vehicleDropdownOpen && vehicleSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                  {/* Duplicate warning */}
                  {exactMatchExists && (
                    <div className="px-3 py-2 bg-red-50 border-b flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-700 font-medium">
                        Vehicle "{formatVehicleNumber(vehicleSearch)}" already
                        exists!
                      </span>
                    </div>
                  )}

                  {/* Show matching vehicles */}
                  {filteredTrucks.length > 0 && !exactMatchExists && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                        Similar vehicles found ({filteredTrucks.length})
                      </div>
                      {filteredTrucks.slice(0, 5).map((truck) => (
                        <div
                          key={truck.id}
                          className="px-3 py-2 text-sm text-gray-600 flex items-center justify-between hover:bg-gray-50"
                        >
                          <span className="mono tracking-wider">
                            {formatVehicleNumber(truck.vehicle_number)}
                          </span>
                          <span className="text-xs text-gray-400">
                            Existing
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* New vehicle indicator */}
                  {vehicleSearch &&
                    !exactMatchExists &&
                    isValidVehicleFormat && (
                      <div className="px-3 py-2 bg-green-50 border-t flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-700">
                          New vehicle:{" "}
                          <span className="font-medium tracking-wider">
                            {formatVehicleNumber(vehicleSearch)}
                          </span>
                        </span>
                      </div>
                    )}

                  {/* Close button */}
                  <div
                    onClick={() => setVehicleDropdownOpen(false)}
                    className="px-3 py-1.5 text-xs text-center text-gray-500 bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                  >
                    Close
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator below input */}
            {vehicleSearch && (
              <div className="mt-1">
                {exactMatchExists ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    This vehicle already exists. Please use a different number.
                  </p>
                ) : isValidVehicleFormat ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Valid format: {formatVehicleNumber(vehicleSearch)}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">
                    Enter valid format: State(2) + District(2) + Series(0-3) +
                    Number(1-4)
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="transporter_id">Transporter</Label>
            <Select
              value={formData.transporter_id}
              onValueChange={(value) =>
                setFormData({ ...formData, transporter_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transporter" />
              </SelectTrigger>
              <SelectContent>
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="current_status">Status</Label>
            <Select
              value={formData.current_status}
              onValueChange={(value) =>
                setFormData({ ...formData, current_status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="capacity_mt">Laden Gross Vehicle Weight (MT)</Label>
            <Input
              id="capacity_mt"
              type="number"
              step="0.001"
              value={formData.capacity_mt}
              onChange={(e) =>
                setFormData({ ...formData, capacity_mt: e.target.value })
              }
              placeholder="e.g., 25.5"
            />
          </div>
          <div>
            <Label htmlFor="tare_weight_mt">Tare Weight (MT)</Label>
            <Input
              id="tare_weight_mt"
              type="number"
              step="0.001"
              value={formData.tare_weight_mt}
              onChange={(e) =>
                setFormData({ ...formData, tare_weight_mt: e.target.value })
              }
              placeholder="e.g., 12.0"
            />
          </div>
          <div>
            <Label htmlFor="calculated_capacity">Capacity (MT)</Label>
            <Input
              id="calculated_capacity"
              type="text"
              readOnly
              value={(() => {
                const ladenWeight = parseFloat(formData.capacity_mt) || 0;
                const tareWeight = parseFloat(formData.tare_weight_mt) || 0;
                if (ladenWeight > 0 && tareWeight > 0) {
                  return (ladenWeight - tareWeight).toFixed(3);
                }
                return "";
              })()}
              placeholder="Auto-calculated"
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="driver_name">Driver Name</Label>
            <Input
              id="driver_name"
              value={formData.driver_name}
              onChange={(e) =>
                setFormData({ ...formData, driver_name: e.target.value })
              }
              placeholder="Driver name"
            />
          </div>
          <div>
            <Label htmlFor="driver_mobile">Driver Mobile</Label>
            <Input
              id="driver_mobile"
              value={formData.driver_mobile}
              onChange={(e) =>
                setFormData({ ...formData, driver_mobile: e.target.value })
              }
              placeholder="10 digit mobile number"
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
            />
          </div>
          <div className="col-span-2">
            <MultiPhotoUpload
              label="Truck Photos"
              value={formData.photos}
              onChange={(photos) => setFormData({ ...formData, photos })}
              maxPhotos={5}
            />
          </div>
          <div className="col-span-2 mt-2">
            <h3 className="font-semibold text-sm mb-3">Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <DualFileUpload
                  label="Fitness Certificate"
                  value={formData.fitness_certificate}
                  onChange={(val) =>
                    setFormData({ ...formData, fitness_certificate: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="mt-2">
                  <Label htmlFor="fitness_valid_upto">Fitness Valid Upto</Label>
                  <Input
                    id="fitness_valid_upto"
                    type="date"
                    value={formData.fitness_valid_upto}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fitness_valid_upto: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <DualFileUpload
                  label="Insurance"
                  value={formData.insurance}
                  onChange={(val) =>
                    setFormData({ ...formData, insurance: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="mt-2">
                  <Label htmlFor="insurance_valid_upto">
                    Insurance Valid Upto
                  </Label>
                  <Input
                    id="insurance_valid_upto"
                    type="date"
                    value={formData.insurance_valid_upto}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insurance_valid_upto: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <DualFileUpload
                  label="Tax"
                  value={formData.tax}
                  onChange={(val) => setFormData({ ...formData, tax: val })}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="mt-2">
                  <Label htmlFor="tax_valid_upto">Tax Valid Upto</Label>
                  <Input
                    id="tax_valid_upto"
                    type="date"
                    value={formData.tax_valid_upto}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tax_valid_upto: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <DualFileUpload
                  label="Pollution"
                  value={formData.pollution}
                  onChange={(val) =>
                    setFormData({ ...formData, pollution: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="mt-2">
                  <Label htmlFor="pollution_valid_upto">
                    Pollution (PUCC) Valid Upto
                  </Label>
                  <Input
                    id="pollution_valid_upto"
                    type="date"
                    value={formData.pollution_valid_upto}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pollution_valid_upto: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
<DualFileUpload
                   label="RC (Registration Certificate)"
                   value={formData.rc}
                   onChange={(val) => setFormData({ ...formData, rc: val })}
                   accept=".pdf,.jpg,.jpeg,.png"
                 />
               </div>
               <div>
                <FileUpload
                  label="m-Parivaahan Doc"
                  value={formData.m_parivaahan}
                  onChange={(val) =>
                    setFormData({ ...formData, m_parivaahan: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="mt-2">
                  <Label htmlFor="registration_date">Registration Date</Label>
                  <Input
                    id="registration_date"
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registration_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-2 mt-2">
            <h3 className="font-semibold text-sm mb-3">Driver Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <DualFileUpload
                  label="Driver License"
                  value={formData.driver_license}
                  onChange={(val) =>
                    setFormData({ ...formData, driver_license: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <div>
                <PhotoUpload
                  value={formData.driver_photo}
                  onChange={(val) =>
                    setFormData({ ...formData, driver_photo: val })
                  }
                  label="Driver's Photo"
                />
              </div>
              <div>
                <DualFileUpload
                  label="Driver's Aadhaar"
                  value={formData.driver_aadhaar}
                  onChange={(val) =>
                    setFormData({ ...formData, driver_aadhaar: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
            </div>
          </div>
          <div className="col-span-2 mt-2">
            <h3 className="font-semibold text-sm mb-3">Helper No. 1</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="helper1_name">Helper No. 1 Name</Label>
                <Input
                  id="helper1_name"
                  value={formData.helper1_name}
                  onChange={(e) =>
                    setFormData({ ...formData, helper1_name: e.target.value })
                  }
                  placeholder="Name"
                />
              </div>
              <div>
                <Label htmlFor="helper1_mobile">Helper No. 1 Mobile</Label>
                <Input
                  id="helper1_mobile"
                  value={formData.helper1_mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, helper1_mobile: e.target.value })
                  }
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                />
              </div>
              <div>
                <DualFileUpload
                  label="Helper No. 1 Aadhaar"
                  value={formData.helper1_aadhaar}
                  onChange={(val) =>
                    setFormData({ ...formData, helper1_aadhaar: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <div>
                <PhotoUpload
                  value={formData.helper1_photo}
                  onChange={(val) =>
                    setFormData({ ...formData, helper1_photo: val })
                  }
                  label="Helper No. 1 Photo"
                />
              </div>
            </div>
          </div>
          <div className="col-span-2 mt-2">
            <h3 className="font-semibold text-sm mb-3">Helper No. 2</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="helper2_name">Helper No. 2 Name</Label>
                <Input
                  id="helper2_name"
                  value={formData.helper2_name}
                  onChange={(e) =>
                    setFormData({ ...formData, helper2_name: e.target.value })
                  }
                  placeholder="Name"
                />
              </div>
              <div>
                <Label htmlFor="helper2_mobile">Helper No. 2 Mobile</Label>
                <Input
                  id="helper2_mobile"
                  value={formData.helper2_mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, helper2_mobile: e.target.value })
                  }
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                />
              </div>
              <div>
                <DualFileUpload
                  label="Helper No. 2 Aadhaar"
                  value={formData.helper2_aadhaar}
                  onChange={(val) =>
                    setFormData({ ...formData, helper2_aadhaar: val })
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <div>
                <PhotoUpload
                  value={formData.helper2_photo}
                  onChange={(val) =>
                    setFormData({ ...formData, helper2_photo: val })
                  }
                  label="Helper No. 2 Photo"
                />
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`Truck Details - ${viewItem?.vehicle_number}`}
        hideSubmit
      >
        {viewItem && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <b>Vehicle:</b> {formatVehicleNumber(viewItem.vehicle_number)}
              </div>
              <div>
                <b>Status:</b> {viewItem.current_status}
              </div>
              <div>
                <b>Laden GV Weight:</b>{" "}
                {viewItem.capacity_mt ? `${viewItem.capacity_mt} MT` : "-"}
              </div>
              <div>
                <b>Tare Weight:</b>{" "}
                {viewItem.tare_weight_mt
                  ? `${viewItem.tare_weight_mt} MT`
                  : "-"}
              </div>
              <div>
                <b>Capacity:</b>{" "}
                {viewItem.capacity_mt && viewItem.tare_weight_mt
                  ? `${(parseFloat(viewItem.capacity_mt) - parseFloat(viewItem.tare_weight_mt)).toFixed(3)} MT`
                  : "-"}
              </div>
            </div>

            {/* Photos */}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">Photos</h3>

              {!viewItem.photos || viewItem.photos.length === 0 ? (
                <p className="text-gray-400 text-sm">No photos uploaded</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {viewItem.photos.map((photo, idx) => (
                    <a
                      key={idx}
                      href={getFileUrl(photo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      <img
                        src={getFileUrl(photo)}
                        alt="truck"
                        className="rounded border max-h-40 object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">Documents</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <b>Fitness Certificate:</b>
                  {viewItem.fitness_certificate && (
                    <div className="mt-1">
                      {typeof viewItem.fitness_certificate === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.fitness_certificate.front && (
                            <a
                              href={getFileUrl(
                                viewItem.fitness_certificate.front,
                              )}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.fitness_certificate.back && (
                            <a
                              href={getFileUrl(
                                viewItem.fitness_certificate.back,
                              )}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.fitness_certificate)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <b>Insurance:</b>
                  {viewItem.insurance && (
                    <div className="mt-1">
                      {typeof viewItem.insurance === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.insurance.front && (
                            <a
                              href={getFileUrl(viewItem.insurance.front)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.insurance.back && (
                            <a
                              href={getFileUrl(viewItem.insurance.back)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.insurance)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <b>Tax:</b>
                  {viewItem.tax && (
                    <div className="mt-1">
                      {typeof viewItem.tax === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.tax.front && (
                            <a
                              href={getFileUrl(viewItem.tax.front)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.tax.back && (
                            <a
                              href={getFileUrl(viewItem.tax.back)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.tax)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <b>Pollution:</b>
                  {viewItem.pollution && (
                    <div className="mt-1">
                      {typeof viewItem.pollution === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.pollution.front && (
                            <a
                              href={getFileUrl(viewItem.pollution.front)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.pollution.back && (
                            <a
                              href={getFileUrl(viewItem.pollution.back)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.pollution)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <b>RC:</b>
                  {viewItem.rc && (
                    <div className="mt-1">
                      {typeof viewItem.rc === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.rc.front && (
                            <a
                              href={getFileUrl(viewItem.rc.front)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.rc.back && (
                            <a
                              href={getFileUrl(viewItem.rc.back)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.rc)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Documents */}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">Driver Documents</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <b>Driver License:</b>
                  {viewItem.driver_license && (
                    <div className="mt-1">
                      {typeof viewItem.driver_license === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.driver_license.front && (
                            <a
                              href={getFileUrl(viewItem.driver_license.front)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.driver_license.back && (
                            <a
                              href={getFileUrl(viewItem.driver_license.back)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.driver_license)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <b>Driver Photo:</b>
                  {viewItem.driver_photo && (
                    <img
                      src={getFileUrl(viewItem.driver_photo)}
                      className="h-10 rounded ml-1 mt-1"
                    />
                  )}
                </div>
                <div>
                  <b>Driver Aadhaar:</b>
                  {viewItem.driver_aadhaar && (
                    <div className="mt-1">
                      {typeof viewItem.driver_aadhaar === "object" ? (
                        <div className="flex gap-2">
                          {viewItem.driver_aadhaar.front && (
                            <a
                              href={getFileUrl(viewItem.driver_aadhaar.front)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Front
                            </a>
                          )}
                          {viewItem.driver_aadhaar.back && (
                            <a
                              href={getFileUrl(viewItem.driver_aadhaar.back)}
                              target="_blank"
                              className="text-blue-600 text-xs"
                            >
                              Back
                            </a>
                          )}
                        </div>
                      ) : (
                        <a
                          href={getFileUrl(viewItem.driver_aadhaar)}
                          target="_blank"
                          className="text-blue-600 ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Helpers */}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">Helpers</h3>
              <div className="space-y-3 text-sm">
                {viewItem.helper1_name && (
                  <div>
                    <b>Helper 1:</b> {viewItem.helper1_name}{" "}
                    {viewItem.helper1_mobile && `(${viewItem.helper1_mobile})`}
                    {viewItem.helper1_aadhaar && (
                      <div className="text-xs mt-1">
                        Aadhaar:{" "}
                        {typeof viewItem.helper1_aadhaar === "object" ? (
                          <div className="flex gap-2">
                            {viewItem.helper1_aadhaar.front && (
                              <a
                                href={getFileUrl(
                                  viewItem.helper1_aadhaar.front,
                                )}
                                target="_blank"
                                className="text-blue-600"
                              >
                                Front
                              </a>
                            )}
                            {viewItem.helper1_aadhaar.back && (
                              <a
                                href={getFileUrl(viewItem.helper1_aadhaar.back)}
                                target="_blank"
                                className="text-blue-600"
                              >
                                Back
                              </a>
                            )}
                          </div>
                        ) : (
                          <a
                            href={getFileUrl(viewItem.helper1_aadhaar)}
                            target="_blank"
                            className="text-blue-600"
                          >
                            View
                          </a>
                        )}
                      </div>
                    )}
                    {viewItem.helper1_photo && (
                      <img
                        src={getFileUrl(viewItem.helper1_photo)}
                        className="h-8 rounded mt-1"
                      />
                    )}
                  </div>
                )}
                {viewItem.helper2_name && (
                  <div>
                    <b>Helper 2:</b> {viewItem.helper2_name}{" "}
                    {viewItem.helper2_mobile && `(${viewItem.helper2_mobile})`}
                    {viewItem.helper2_aadhaar && (
                      <div className="text-xs mt-1">
                        Aadhaar:{" "}
                        {typeof viewItem.helper2_aadhaar === "object" ? (
                          <div className="flex gap-2">
                            {viewItem.helper2_aadhaar.front && (
                              <a
                                href={getFileUrl(
                                  viewItem.helper2_aadhaar.front,
                                )}
                                target="_blank"
                                className="text-blue-600"
                              >
                                Front
                              </a>
                            )}
                            {viewItem.helper2_aadhaar.back && (
                              <a
                                href={getFileUrl(viewItem.helper2_aadhaar.back)}
                                target="_blank"
                                className="text-blue-600"
                              >
                                Back
                              </a>
                            )}
                          </div>
                        ) : (
                          <a
                            href={getFileUrl(viewItem.helper2_aadhaar)}
                            target="_blank"
                            className="text-blue-600"
                          >
                            View
                          </a>
                        )}
                      </div>
                    )}
                    {viewItem.helper2_photo && (
                      <img
                        src={getFileUrl(viewItem.helper2_photo)}
                        className="h-8 rounded mt-1"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Truck"
        description={`Are you sure you want to delete truck "${selectedItem?.vehicle_number}"? This action cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
