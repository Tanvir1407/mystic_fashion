"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPinned, Edit, Trash2, X, Loader2 } from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import { saveCustomerAddressAction, deleteCustomerAddressAction } from "../../actions/addressActions";
import { getPathaoCities, getPathaoZones, getPathaoAreas } from "../../actions/pathao";

interface Address {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  address: string;
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  zoneName?: string | null;
  areaName?: string | null;
  isDefault: boolean;
}

interface AddressesTabProps {
  addresses: Address[];
  customer: {
    name: string;
    phone: string;
  };
}

export default function AddressesTab({ addresses: initialAddresses, customer }: AddressesTabProps) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isPending, startTransition] = useTransition();

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressName, setAddressName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);

  // Pathao select states inside Address Form
  const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
  const [zones, setZones] = useState<{ value: string; label: string }[]>([]);
  const [areas, setAreas] = useState<{ value: string; label: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [modalError, setModalError] = useState("");

  // Sync addresses with initialAddresses prop
  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  // Fetch Pathao cities on modal mount
  useEffect(() => {
    if (isAddressModalOpen) {
      async function loadCities() {
        setLoadingLocations(true);
        const res = await getPathaoCities();
        if (res.success && res.data) {
          setCities(res.data.map((c: any) => ({ value: c.city_id.toString(), label: c.city_name })));
        }
        setLoadingLocations(false);
      }
      loadCities();
    }
  }, [isAddressModalOpen]);

  // Fetch Zones when City changes inside Address Form
  useEffect(() => {
    if (selectedCityId) {
      async function loadZones() {
        setLoadingLocations(true);
        const res = await getPathaoZones(selectedCityId!);
        if (res.success && res.data) {
          setZones(res.data.map((z: any) => ({ value: z.zone_id.toString(), label: z.zone_name })));
        }
        setLoadingLocations(false);
      }
      loadZones();
      setZones([]);
      setAreas([]);
      setSelectedZoneId(null);
      setSelectedAreaId(null);
    }
  }, [selectedCityId]);

  // Fetch Areas when Zone changes inside Address Form
  useEffect(() => {
    if (selectedZoneId) {
      async function loadAreas() {
        setLoadingLocations(true);
        const res = await getPathaoAreas(selectedZoneId!);
        if (res.success && res.data) {
          setAreas(res.data.map((a: any) => ({ value: a.area_id.toString(), label: a.area_name })));
        }
        setLoadingLocations(false);
      }
      loadAreas();
      setAreas([]);
      setSelectedAreaId(null);
    }
  }, [selectedZoneId]);

  // Open Add Address Modal
  const openAddModal = () => {
    if (addresses.length >= 2) {
      alert("You have reached the maximum address limit (2 addresses max). Please edit or delete an existing address.");
      return;
    }
    setEditingAddress(null);
    setAddressLabel("Home");
    setAddressName(customer.name);
    setAddressPhone(customer.phone);
    setAddressDetails("");
    setIsDefaultAddress(addresses.length === 0);
    setSelectedCityId(null);
    setSelectedZoneId(null);
    setSelectedAreaId(null);
    setModalError("");
    setIsAddressModalOpen(true);
  };

  // Open Edit Address Modal
  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setAddressLabel(addr.label);
    setAddressName(addr.fullName);
    setAddressPhone(addr.phone);
    setAddressDetails(addr.address);
    setIsDefaultAddress(addr.isDefault);
    setSelectedCityId(addr.pathaoCityId || null);
    setSelectedZoneId(addr.pathaoZoneId || null);
    setSelectedAreaId(addr.pathaoAreaId || null);
    setModalError("");
    setIsAddressModalOpen(true);
  };

  // Handle Address Submit
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!addressName.trim() || !addressPhone.trim() || !addressDetails.trim() || !selectedCityId || !selectedZoneId || !selectedAreaId) {
      setModalError("Please fill out all the fields and select your delivery location.");
      return;
    }

    const cityName = cities.find(c => c.value === selectedCityId.toString())?.label || "";
    const selectedZoneName = zones.find(z => z.value === selectedZoneId?.toString())?.label || "";
    const selectedAreaName = areas.find(a => a.value === selectedAreaId?.toString())?.label || "";

    const payload = {
      id: editingAddress?.id,
      label: addressLabel,
      fullName: addressName.trim(),
      phone: addressPhone.trim(),
      district: cityName,
      address: addressDetails.trim(),
      pathaoCityId: selectedCityId,
      pathaoZoneId: selectedZoneId,
      pathaoAreaId: selectedAreaId,
      zoneName: selectedZoneName,
      areaName: selectedAreaName,
      isDefault: isDefaultAddress
    };

    startTransition(async () => {
      const res = await saveCustomerAddressAction(payload);
      if (res.success) {
        setIsAddressModalOpen(false);
        router.refresh();
        // Dynamically update address state to avoid reload lag
        window.location.reload();
      } else {
        setModalError(res.error || "Failed to save address.");
      }
    });
  };

  // Handle Address Delete
  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    const res = await deleteCustomerAddressAction(id);
    if (res.success) {
      setAddresses(prev => prev.filter(a => a.id !== id));
      router.refresh();
      // Reload page is required to sync default changes
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete address.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-medium text-slate-900 tracking-tight">Saved Addresses</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5">
            Manage up to 2 addresses for shipping checkout speed.
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={addresses.length >= 2}
          className="px-4 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold  transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed rounded"
        >
          <Plus className="w-4 h-4" /> Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="py-16 text-center">
          <MapPinned className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 text-sm">No saved addresses</p>
          <p className="text-xs text-slate-400 mt-1 mb-6">Add your shipping details for lightning fast checkouts.</p>
          <button
            onClick={openAddModal}
            className="bg-[#800020] text-white px-5 py-2.5 text-xs font-medium hover:bg-[#600018] transition-colors rounded"
          >
            Add First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="py-5 border-b border-slate-100 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-sm font-semibold text-[9px] uppercase tracking-wider">
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[9px] font-semibold  text-[#800020] bg-rose-50 px-2 py-0.5 rounded-sm">
                      Default Shipping
                    </span>
                  )}
                </div>

                <h4 className="font-semibold text-sm text-slate-900">{addr.fullName}</h4>
                <p className="text-xs text-slate-500 font-light mt-1.5">{addr.phone}</p>
                <p className="text-xs text-slate-600 mt-1 font-light leading-relaxed">{addr.address}</p>
                <div className="text-xs text-slate-500 font-light mt-1 space-y-0.5">
                  {addr.areaName && <p>{addr.areaName}{addr.zoneName ? `, ${addr.zoneName}` : ""}</p>}
                  <p className="font-medium text-slate-400">{addr.district}, Bangladesh</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100/60">
                <button
                  onClick={() => openEditModal(addr)}
                  className="text-xs font-semibold text-[#800020] hover:underline flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <span className="text-slate-200">&bull;</span>
                <button
                  onClick={() => addr.id && handleDeleteAddress(addr.id)}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──────── ADDRESS MODAL FORM ──────── */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg border border-slate-200 p-6 sm:p-8 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-semibold border-b border-slate-100 pb-3 mb-6">
              {editingAddress ? "Edit Shipping Address" : "Add Shipping Address"}
            </h3>

            {modalError && (
              <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              {/* Address label */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  Address Label
                </label>
                <div className="flex gap-2">
                  {["Home", "Office", "Other"].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setAddressLabel(l)}
                      className={`flex-1 py-2 text-xs font-medium transition-all border ${addressLabel === l
                        ? "bg-[#800020] text-white border-primary"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={addressName}
                    onChange={(e) => setAddressName(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:border-slate-950 font-medium"
                    placeholder="Recipient's name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={addressPhone}
                    onChange={(e) => setAddressPhone(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:border-slate-950 font-medium"
                    placeholder="e.g. 017xxxxxxxx"
                    required
                  />
                </div>
              </div>

              {/* Pathao selectors */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">
                    City *
                  </label>
                  <CustomSelect
                    options={cities}
                    value={selectedCityId?.toString() || ""}
                    onChange={(val) => setSelectedCityId(parseInt(val))}
                    placeholder={loadingLocations ? "Loading cities..." : "-- Select City --"}
                    searchable={true}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Zone *
                    </label>
                    <CustomSelect
                      options={zones}
                      value={selectedZoneId?.toString() || ""}
                      onChange={(val) => setSelectedZoneId(parseInt(val))}
                      placeholder={selectedCityId ? "-- Select Zone --" : "First select a city"}
                      disabled={!selectedCityId}
                      searchable={true}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Area *
                    </label>
                    <CustomSelect
                      options={areas}
                      value={selectedAreaId?.toString() || ""}
                      onChange={(val) => setSelectedAreaId(parseInt(val))}
                      placeholder={selectedZoneId ? "-- Select Area --" : "First select a zone"}
                      disabled={!selectedZoneId}
                      searchable={true}
                    />
                  </div>
                </div>
              </div>

              {/* Specific Street Detail address */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  House, Street, Flat details *
                </label>
                <textarea
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  rows={2.5}
                  className="w-full p-3 border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:border-slate-950 font-medium resize-none"
                  placeholder="e.g. House 12, Road 4, Block C, near central mosque"
                  required
                />
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="default-chk"
                  checked={isDefaultAddress}
                  disabled={addresses.length === 0} // First address MUST be default
                  onChange={(e) => setIsDefaultAddress(e.target.checked)}
                  className="w-4 h-4 border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="default-chk" className="text-xs font-medium text-slate-600 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              {/* Submit button */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || loadingLocations}
                  className="flex-1 py-2.5 bg-[#800020] hover:bg-[#600018] text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
