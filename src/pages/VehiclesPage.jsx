import { useMemo, useState } from "react";
import {
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Fuel,
  Gauge,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAppData } from "../context/useAppData.js";
import "./VehiclesPage.css";

const CURRENT_YEAR = new Date().getFullYear();
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "Other"];
const EMPTY_VEHICLE = {
  registration: "",
  make: "",
  model: "",
  year: String(CURRENT_YEAR),
  ownerName: "",
  ownerPhone: "",
  fuelType: "Petrol",
  color: "",
  vin: "",
};

function createVehicleId(vehicles) {
  const takenIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const prefix = `VEH-${CURRENT_YEAR}-${Date.now().toString().slice(-6)}`;
  let id = prefix;
  let suffix = 1;
  while (takenIds.has(id)) {
    id = `${prefix}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function VehicleForm({ vehicle, vehicleId, vehicles, onClose, onSave }) {
  const [values, setValues] = useState(vehicle || EMPTY_VEHICLE);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submitForm(event) {
    event.preventDefault();
    const registration = values.registration.trim().toUpperCase().replace(/\s+/g, " ");
    const year = Number(values.year);
    if (vehicles.some((item) => item.registration.toUpperCase() === registration && item.id !== vehicle?.id)) {
      setError("A vehicle with this registration number already exists.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(values.ownerPhone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR + 1) {
      setError(`Enter a valid model year between 1950 and ${CURRENT_YEAR + 1}.`);
      return;
    }
    setError("");
    onSave({
      ...values,
      id: vehicle?.id || vehicleId,
      registration,
      make: values.make.trim(),
      model: values.model.trim(),
      year,
      ownerName: values.ownerName.trim(),
      ownerPhone: values.ownerPhone.trim(),
      color: values.color.trim(),
      vin: values.vin.trim().toUpperCase(),
    });
  }

  return (
    <div className="vehicle-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title">
        <div className="vehicle-modal-heading">
          <div><span className="vehicle-eyebrow">{vehicle ? "VEHICLE RECORD" : "FLEET REGISTRATION"}</span><h2 id="vehicle-form-title">{vehicle ? "Edit vehicle" : "Add vehicle"}</h2></div>
          <button type="button" className="vehicle-icon-button" onClick={onClose} aria-label="Close form"><X size={20} /></button>
        </div>
        <div className="vehicle-id-callout"><CarFront size={17} /><span>Vehicle ID</span><strong>{vehicle?.id || vehicleId}</strong></div>
        {error && <p className="vehicle-form-error" role="alert">{error}</p>}
        <form onSubmit={submitForm}>
          <div className="vehicle-form-grid">
            <label>Registration number <b>*</b><input name="registration" value={values.registration} onChange={updateField} required maxLength={20} placeholder="Vehicle registration number" /></label>
            <label>Make <b>*</b><input name="make" value={values.make} onChange={updateField} required maxLength={80} placeholder="Vehicle make" /></label>
            <label>Model <b>*</b><input name="model" value={values.model} onChange={updateField} required maxLength={80} placeholder="Vehicle model" /></label>
            <label>Model year <b>*</b><input name="year" type="number" min="1950" max={CURRENT_YEAR + 1} step="1" value={values.year} onChange={updateField} required /></label>
            <label>Owner name <b>*</b><input name="ownerName" value={values.ownerName} onChange={updateField} required maxLength={100} placeholder="Customer full name" /></label>
            <label>Owner phone <b>*</b><input name="ownerPhone" type="tel" inputMode="numeric" value={values.ownerPhone} onChange={updateField} required maxLength={10} placeholder="10-digit mobile number" /></label>
            <label>Fuel type <b>*</b><select name="fuelType" value={values.fuelType} onChange={updateField}>{FUEL_TYPES.map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label>
            <label>Color<input name="color" value={values.color} onChange={updateField} maxLength={50} placeholder="Vehicle color" /></label>
            <label className="vehicle-form-full-width">VIN / chassis number (optional)<input name="vin" value={values.vin} onChange={updateField} maxLength={40} placeholder="Vehicle identification number" /></label>
          </div>
          <div className="vehicle-modal-actions">
            <button type="button" className="vehicle-button vehicle-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="vehicle-button vehicle-button-primary"><Check size={17} />{vehicle ? "Save changes" : "Add vehicle"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function VehicleDetails({ vehicle, linkedBookings, onClose, onEdit }) {
  return (
    <div className="vehicle-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="vehicle-modal vehicle-details-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-details-title">
        <div className="vehicle-modal-heading"><div><span className="vehicle-eyebrow">{vehicle.id}</span><h2 id="vehicle-details-title">Vehicle details</h2></div><button type="button" className="vehicle-icon-button" onClick={onClose} aria-label="Close details"><X size={20} /></button></div>
        <div className="vehicle-profile-header"><span className="vehicle-profile-icon"><CarFront size={25} /></span><div><h3>{vehicle.registration}</h3><p>{vehicle.year} {vehicle.make} {vehicle.model}</p></div></div>
        <div className="vehicle-detail-grid">
          <DetailItem icon={UserRound} label="Owner" value={vehicle.ownerName} secondary={vehicle.ownerPhone} />
          <DetailItem icon={Fuel} label="Fuel type" value={vehicle.fuelType} />
          <DetailItem icon={CarFront} label="Color" value={vehicle.color || "Not recorded"} />
          <DetailItem icon={Gauge} label="VIN / chassis" value={vehicle.vin || "Not recorded"} />
          <DetailItem icon={CalendarDays} label="Linked service bookings" value={linkedBookings.length} />
        </div>
        {linkedBookings.length > 0 && (
          <div className="vehicle-linked-bookings">
            <strong>Recent bookings</strong>
            {linkedBookings.slice(0, 5).map((booking) => <div key={booking.id}><span>{booking.id} · {booking.serviceType}</span><small>{booking.status}</small></div>)}
          </div>
        )}
        <div className="vehicle-modal-actions"><button type="button" className="vehicle-button vehicle-button-secondary" onClick={onClose}>Close</button><button type="button" className="vehicle-button vehicle-button-primary" onClick={onEdit}><Pencil size={16} />Edit vehicle</button></div>
      </section>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, secondary }) {
  return <div className="vehicle-detail-item"><span><Icon size={16} /></span><div><small>{label}</small><strong>{value}</strong>{secondary && <span>{secondary}</span>}</div></div>;
}

export default function VehiclesPage() {
  const {
    vehicles,
    bookings,
    maintenanceReminders,
    updateWorkspace,
  } = useAppData();
  const [query, setQuery] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);

  const linkedCount = useMemo(() => {
    const counts = new Map();
    bookings.forEach((booking) => counts.set(booking.vehicleNumber, (counts.get(booking.vehicleNumber) || 0) + 1));
    return counts;
  }, [bookings]);

  const visibleVehicles = useMemo(() => {
    const term = query.trim().toLowerCase();
    return vehicles
      .filter((vehicle) => !term || [
        vehicle.registration, vehicle.make, vehicle.model, vehicle.ownerName, vehicle.ownerPhone,
      ].some((value) => String(value).toLowerCase().includes(term)))
      .filter((vehicle) => !fuelFilter || vehicle.fuelType === fuelFilter)
      .sort((a, b) => sortDirection === "asc"
        ? a.registration.localeCompare(b.registration)
        : b.registration.localeCompare(a.registration));
  }, [vehicles, query, fuelFilter, sortDirection]);

  async function saveVehicle(values) {
    const editingVehicle = modal.type === "edit" ? modal.vehicle : null;
    try {
      await updateWorkspace((current) => editingVehicle
        ? {
          ...current,
          vehicles: current.vehicles.map((vehicle) => vehicle.id === editingVehicle.id ? values : vehicle),
          bookings: current.bookings.map((booking) => booking.vehicleNumber === editingVehicle.registration
            ? { ...booking, vehicleNumber: values.registration, vehicleModel: `${values.make} ${values.model}`, customerName: values.ownerName, phone: values.ownerPhone }
            : booking),
          invoices: current.invoices.map((invoice) => invoice.vehicleNumber === editingVehicle.registration
            ? { ...invoice, vehicleNumber: values.registration, vehicleModel: `${values.make} ${values.model}`, customerName: values.ownerName, customerPhone: values.ownerPhone }
            : invoice),
          maintenanceReminders: current.maintenanceReminders.map((reminder) => reminder.vehicleNumber === editingVehicle.registration
            ? { ...reminder, vehicleNumber: values.registration, vehicleModel: `${values.make} ${values.model}`, customerName: values.ownerName }
            : reminder),
        }
        : { ...current, vehicles: [{ ...values }, ...current.vehicles] });
      setNotice({
        type: "success",
        message: editingVehicle
          ? "Vehicle updated. Linked bookings, invoices, and reminders were synchronized."
          : "Vehicle added to the shared fleet list.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function deleteVehicle(vehicle) {
    const relatedBookings = bookings.filter((booking) => booking.vehicleNumber === vehicle.registration);
    if (relatedBookings.length) {
      setNotice({ type: "error", message: `Cannot delete ${vehicle.registration}: ${relatedBookings.length} linked booking(s) use this vehicle. Keep it to preserve service records.` });
      return;
    }
    if (maintenanceReminders.some((reminder) => reminder.vehicleNumber === vehicle.registration)) {
      setNotice({ type: "error", message: `Cannot delete ${vehicle.registration}: maintenance reminders are linked to this vehicle.` });
      return;
    }
    if (!window.confirm(`Delete vehicle ${vehicle.registration} (${vehicle.make} ${vehicle.model})?`)) return;
    try {
      await updateWorkspace((current) => ({
        ...current,
        vehicles: current.vehicles.filter((item) => item.id !== vehicle.id),
      }));
      setNotice({ type: "success", message: "Vehicle deleted." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  function clearFilters() {
    setQuery("");
    setFuelFilter("");
  }

  return (
    <div className="vehicles-page">
      <div className="vehicles-page-heading">
        <div><span className="vehicle-eyebrow">FLEET DIRECTORY</span><h1>Vehicle Management</h1><p>Keep customer vehicles and their service records organized.</p></div>
        <button type="button" className="vehicle-button vehicle-button-primary" onClick={() => setModal({ type: "create", vehicleId: createVehicleId(vehicles) })}><Plus size={18} />Add vehicle</button>
      </div>

      <div className="vehicle-data-notice"><span />Vehicle records are stored locally in this browser.</div>
      {notice && <div className={`vehicle-notice${notice.type === "error" ? " vehicle-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>{notice.type === "error" ? <X size={17} /> : <Check size={17} />}<span>{notice.message}</span><button type="button" className="vehicle-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={17} /></button></div>}

      <section className="vehicle-metrics-grid" aria-label="Vehicle summary">
        <article className="vehicle-metric-card"><span className="vehicle-metric-icon metric-blue"><CarFront size={20} /></span><div><p>Total vehicles</p><strong>{vehicles.length}</strong></div></article>
        <article className="vehicle-metric-card"><span className="vehicle-metric-icon metric-green"><UserRound size={20} /></span><div><p>Linked to service history</p><strong>{vehicles.filter((vehicle) => linkedCount.has(vehicle.registration)).length}</strong></div></article>
        <article className="vehicle-metric-card"><span className="vehicle-metric-icon metric-violet"><CalendarDays size={20} /></span><div><p>Total service bookings</p><strong>{bookings.length}</strong></div></article>
      </section>

      <section className="vehicle-table-card">
        <div className="vehicle-section-heading">
          <div><h2>Registered vehicles</h2><p>{visibleVehicles.length} {visibleVehicles.length === 1 ? "vehicle" : "vehicles"} shown</p></div>
          <button type="button" className="vehicle-sort-button" onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>Registration {sortDirection === "asc" ? "A–Z" : "Z–A"}<ChevronDown size={15} /></button>
        </div>
        <div className="vehicle-filters">
          <label className="vehicle-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration, make, model, or owner" aria-label="Search vehicles" /></label>
          <label className="vehicle-filter"><span className="visually-hidden">Filter by fuel type</span><select value={fuelFilter} onChange={(event) => setFuelFilter(event.target.value)}><option value="">All fuel types</option>{FUEL_TYPES.map((fuel) => <option key={fuel}>{fuel}</option>)}</select><ChevronDown size={15} /></label>
          {(query || fuelFilter) && <button type="button" className="vehicle-clear-filters" onClick={clearFilters}>Clear filters</button>}
        </div>
        <div className="vehicle-table-scroll">
          <table className="vehicle-table">
            <thead><tr><th>Vehicle</th><th>Owner</th><th>Fuel type</th><th>Year</th><th>Service records</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {visibleVehicles.map((vehicle) => {
                const vehicleBookings = bookings.filter((booking) => booking.vehicleNumber === vehicle.registration);
                return (
                  <tr key={vehicle.id}>
                    <td><div className="vehicle-table-person"><span className="vehicle-row-icon"><CarFront size={18} /></span><div><button type="button" className="vehicle-registration-link" onClick={() => setModal({ type: "view", vehicle })}>{vehicle.registration}</button><span>{vehicle.make} {vehicle.model}</span></div></div></td>
                    <td><strong className="vehicle-owner-name">{vehicle.ownerName}</strong><span className="vehicle-secondary">{vehicle.ownerPhone}</span></td>
                    <td>{vehicle.fuelType}</td>
                    <td>{vehicle.year}</td>
                    <td><span className="vehicle-booking-count">{vehicleBookings.length}</span></td>
                    <td><div className="vehicle-row-actions">
                      <button type="button" className="vehicle-icon-button" onClick={() => setModal({ type: "view", vehicle })} aria-label={`View ${vehicle.registration}`} title="View vehicle"><CarFront size={16} /></button>
                      <button type="button" className="vehicle-icon-button" onClick={() => setModal({ type: "edit", vehicle })} aria-label={`Edit ${vehicle.registration}`} title="Edit vehicle"><Pencil size={16} /></button>
                      <button type="button" className="vehicle-icon-button vehicle-delete-action" onClick={() => deleteVehicle(vehicle)} aria-label={`Delete ${vehicle.registration}`} title="Delete vehicle"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                );
              })}
              {visibleVehicles.length === 0 && <tr><td className="vehicle-empty-state" colSpan="6">{vehicles.length === 0 ? "No vehicles registered yet. Add a vehicle to get started." : "No vehicles match your search. Adjust your filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === "create" && <VehicleForm vehicleId={modal.vehicleId} vehicles={vehicles} onClose={() => setModal(null)} onSave={saveVehicle} />}
      {modal?.type === "edit" && <VehicleForm vehicle={modal.vehicle} vehicles={vehicles} onClose={() => setModal(null)} onSave={saveVehicle} />}
      {modal?.type === "view" && <VehicleDetails vehicle={modal.vehicle} linkedBookings={bookings.filter((booking) => booking.vehicleNumber === modal.vehicle.registration)} onClose={() => setModal(null)} onEdit={() => setModal({ type: "edit", vehicle: modal.vehicle })} />}
    </div>
  );
}
