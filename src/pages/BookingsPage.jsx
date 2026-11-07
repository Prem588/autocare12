import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  IndianRupee,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAppData } from "../context/useAppData.js";
import { canAcceptMechanicAssignment, getAssignedMechanic } from "../utils/mechanicAvailability.js";
import "./BookingsPage.css";

const STATUSES = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];
const DEFAULT_TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
];

const EMPTY_BOOKING = {
  customerName: "",
  phone: "",
  vehicleNumber: "",
  vehicleModel: "",
  serviceType: "General Service",
  bookingDate: "",
  timeSlot: DEFAULT_TIME_SLOTS[0],
  mechanic: "Unassigned",
  description: "",
  estimatedCost: "",
  status: "Pending",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function makeBookingId(bookings) {
  const takenIds = new Set(bookings.map((booking) => booking.id));
  const prefix = `BK-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  let id = prefix;
  let suffix = 1;
  while (takenIds.has(id)) {
    id = `${prefix}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function formatTime(minutes) {
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 || 12;
  const minute = String(minutes % 60).padStart(2, "0");
  return `${String(hour12).padStart(2, "0")}:${minute} ${hour24 < 12 ? "AM" : "PM"}`;
}

function createTimeSlots(duration) {
  if (duration === 60) return DEFAULT_TIME_SLOTS;
  const slots = [];
  for (let start = 9 * 60; start + duration <= 17 * 60; start += duration) {
    const end = start + duration;
    if (start < 13 * 60 && end > 12 * 60) continue;
    slots.push(`${formatTime(start)} - ${formatTime(end)}`);
  }
  return slots.length ? slots : DEFAULT_TIME_SLOTS;
}

function StatusBadge({ status }) {
  return <span className={`booking-status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <article className="booking-summary-card">
      <div className={`summary-icon summary-icon-${tone}`}><Icon size={20} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function BookingForm({ booking, bookingId, bookings, mechanics, serviceConfiguration, onClose, onSave }) {
  const availableServiceTypes = serviceConfiguration.serviceTypes;
  const timeSlots = createTimeSlots(serviceConfiguration.bookingDuration);
  const currentMechanic = mechanics.find((mechanic) => mechanic.id === booking?.mechanicId)
    || mechanics.find((mechanic) => mechanic.fullName === booking?.mechanic);
  const otherBookings = bookings.filter((item) => item.id !== booking?.id);
  const assignableMechanics = mechanics.filter((mechanic) => (
    canAcceptMechanicAssignment(mechanic, undefined, otherBookings) || mechanic.id === currentMechanic?.id
  ));
  const [values, setValues] = useState(() => booking || {
    ...EMPTY_BOOKING,
    serviceType: availableServiceTypes[0] || EMPTY_BOOKING.serviceType,
    timeSlot: timeSlots[0] || EMPTY_BOOKING.timeSlot,
    estimatedCost: serviceConfiguration.defaultLabourCharge > 0 ? String(serviceConfiguration.defaultLabourCharge) : "",
  });
  const [error, setError] = useState("");
  const [selectedMechanicId, setSelectedMechanicId] = useState(
    currentMechanic?.id || "",
  );

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateMechanic(event) {
    setSelectedMechanicId(event.target.value);
  }

  function submitForm(event) {
    event.preventDefault();
    const phone = values.phone.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!Number.isFinite(Number(values.estimatedCost)) || Number(values.estimatedCost) < 0) {
      setError("Enter a valid estimated cost.");
      return;
    }
    const assignedMechanic = mechanics.find((mechanic) => mechanic.id === selectedMechanicId);
    if (selectedMechanicId && (!assignedMechanic || (
      !canAcceptMechanicAssignment(assignedMechanic, undefined, otherBookings) && assignedMechanic.id !== currentMechanic?.id
    ))) {
      setError("Select an available mechanic, or leave this booking unassigned.");
      return;
    }
    setError("");
    onSave({
      ...values,
      id: booking?.id || bookingId,
      mechanicId: assignedMechanic?.id || "",
      mechanic: assignedMechanic?.fullName || "Unassigned",
      customerName: values.customerName.trim(),
      phone,
      vehicleNumber: values.vehicleNumber.trim().toUpperCase(),
      vehicleModel: values.vehicleModel.trim(),
      description: values.description.trim(),
      estimatedCost: Number(values.estimatedCost),
    });
  }

  return (
    <div className="booking-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="booking-modal booking-form-modal" role="dialog" aria-modal="true" aria-labelledby="booking-form-title">
        <div className="booking-modal-heading">
          <div>
            <span className="booking-eyebrow">{booking ? "UPDATE BOOKING" : "NEW APPOINTMENT"}</span>
            <h2 id="booking-form-title">{booking ? "Edit booking" : "Create service booking"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close form"><X size={20} /></button>
        </div>
        <form onSubmit={submitForm}>
          <div className="booking-id-note">
            <ClipboardList size={17} />
            <span>Booking ID</span>
            <strong>{booking?.id || bookingId}</strong>
          </div>
          {error && <p className="booking-form-error" role="alert">{error}</p>}
          <div className="booking-form-grid">
            <label>
              Customer name <b>*</b>
              <input name="customerName" value={values.customerName} onChange={updateField} required maxLength={100} placeholder="Customer full name" />
            </label>
            <label>
              Phone number <b>*</b>
              <input name="phone" type="tel" value={values.phone} onChange={updateField} required inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" />
            </label>
            <label>
              Vehicle registration <b>*</b>
              <input name="vehicleNumber" value={values.vehicleNumber} onChange={updateField} required maxLength={20} placeholder="Vehicle registration number" />
            </label>
            <label>
              Vehicle model <b>*</b>
              <input name="vehicleModel" value={values.vehicleModel} onChange={updateField} required maxLength={80} placeholder="e.g. Hyundai Creta" />
            </label>
            <label>
              Service type <b>*</b>
              <select name="serviceType" value={values.serviceType} onChange={updateField} required>
                {[...new Set([values.serviceType, ...availableServiceTypes])].map((service) => <option key={service}>{service}</option>)}
              </select>
            </label>
            <label>
              Booking date <b>*</b>
              <input name="bookingDate" type="date" value={values.bookingDate} onChange={updateField} required />
            </label>
            <label>
              Preferred time slot <b>*</b>
              <select name="timeSlot" value={values.timeSlot} onChange={updateField} required>
                {[...new Set([values.timeSlot, ...timeSlots])].map((slot) => <option key={slot}>{slot}</option>)}
              </select>
            </label>
            <label>
              Assign mechanic
              <select name="mechanicId" value={selectedMechanicId} onChange={updateMechanic}>
                <option value="">Unassigned</option>
                {assignableMechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.fullName} · {mechanic.id} · {mechanic.specialization} · {mechanic.availability}
                  </option>
                ))}
              </select>
              <small>{assignableMechanics.length === 0
                ? "No mechanics are currently available. You can save the booking unassigned."
                : "Only available mechanics can receive a new booking assignment."}</small>
            </label>
            <label>
              Estimated cost (₹) <b>*</b>
              <input name="estimatedCost" type="number" value={values.estimatedCost} onChange={updateField} required min="0" step="1" placeholder="0" />
            </label>
            <label>
              Booking status <b>*</b>
              <select name="status" value={values.status} onChange={updateField} required>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="booking-description-field">
              Service description
              <textarea name="description" value={values.description} onChange={updateField} rows="3" maxLength={500} placeholder="Describe the requested work or customer concerns" />
            </label>
          </div>
          <div className="booking-modal-actions">
            <button type="button" className="booking-button button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="booking-button button-primary"><Check size={17} />{booking ? "Save changes" : "Create booking"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BookingDetails({ booking, assignedMechanic, onClose, onEdit }) {
  return (
    <div className="booking-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="booking-modal booking-details-modal" role="dialog" aria-modal="true" aria-labelledby="booking-details-title">
        <div className="booking-modal-heading">
          <div>
            <span className="booking-eyebrow">{booking.id}</span>
            <h2 id="booking-details-title">Booking details</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        </div>
        <div className="details-status"><StatusBadge status={booking.status} /></div>
        <div className="booking-detail-grid">
          <DetailItem icon={UserRound} label="Customer" value={booking.customerName} secondary={booking.phone} />
          <DetailItem icon={CarFront} label="Vehicle" value={booking.vehicleNumber} secondary={booking.vehicleModel} />
          <DetailItem icon={Wrench} label="Service" value={booking.serviceType} secondary={`Mechanic: ${assignedMechanic?.fullName || "Unassigned"}`} />
          <DetailItem icon={CalendarDays} label="Appointment" value={formatDate(booking.bookingDate)} secondary={booking.timeSlot} />
          <DetailItem icon={IndianRupee} label="Estimated cost" value={currency.format(booking.estimatedCost)} />
          <DetailItem icon={ClipboardList} label="Description" value={booking.description || "No description provided"} />
        </div>
        <div className="booking-modal-actions">
          <button type="button" className="booking-button button-secondary" onClick={onClose}>Close</button>
          <button type="button" className="booking-button button-primary" onClick={onEdit}><Pencil size={16} />Edit booking</button>
        </div>
      </section>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, secondary }) {
  return (
    <div className="booking-detail-item">
      <span className="detail-item-icon"><Icon size={17} /></span>
      <div><small>{label}</small><strong>{value}</strong>{secondary && <span>{secondary}</span>}</div>
    </div>
  );
}

export default function BookingsPage() {
  const { bookings, mechanics, serviceConfiguration, invoices, updateWorkspace } = useAppData();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [modal, setModal] = useState(() => {
    const booking = bookings.find((item) => item.id === location.state?.bookingId);
    return booking ? { type: "view", booking } : null;
  });
  const [notice, setNotice] = useState(null);
  const selectedMechanic = modal?.booking ? getAssignedMechanic(modal.booking, mechanics) : null;

  const summary = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((booking) => booking.status === "Pending").length,
    inProgress: bookings.filter((booking) => booking.status === "In Progress").length,
    completed: bookings.filter((booking) => booking.status === "Completed").length,
  }), [bookings]);

  const visibleBookings = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    return bookings
      .filter((booking) => !searchTerm || [
        booking.id, booking.customerName, booking.vehicleNumber, booking.serviceType,
      ].some((value) => value.toLowerCase().includes(searchTerm)))
      .filter((booking) => !statusFilter || booking.status === statusFilter)
      .filter((booking) => !dateFilter || booking.bookingDate === dateFilter)
      .sort((a, b) => sortDirection === "asc"
        ? a.bookingDate.localeCompare(b.bookingDate)
        : b.bookingDate.localeCompare(a.bookingDate));
  }, [bookings, query, statusFilter, dateFilter, sortDirection]);

  async function saveBooking(values) {
    const editing = modal.type === "edit";
    try {
      await updateWorkspace((current) => ({
        ...current,
        bookings: editing
          ? current.bookings.map((booking) => booking.id === modal.booking.id
            ? { ...values, id: booking.id }
            : booking)
          : [{ ...values }, ...current.bookings],
      }));
      setNotice({
        type: "success",
        message: editing ? "Booking updated successfully." : "Booking saved in this browser.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function updateStatus(id, status) {
    try {
      await updateWorkspace((current) => ({
        ...current,
        bookings: current.bookings.map((booking) => booking.id === id ? { ...booking, status } : booking),
      }));
      setNotice({ type: "success", message: "Booking status updated." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function deleteBooking(booking) {
    if (invoices.some((invoice) => invoice.bookingId === booking.id)) {
      setNotice({ type: "error", message: `Cannot delete ${booking.id}: an invoice is linked to this booking.` });
      return;
    }
    if (!window.confirm(`Delete booking ${booking.id} for ${booking.customerName}? This cannot be undone.`)) return;
    try {
      await updateWorkspace((current) => ({
        ...current,
        bookings: current.bookings.filter((item) => item.id !== booking.id),
      }));
      setNotice({ type: "success", message: "Booking deleted." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setDateFilter("");
  }

  return (
    <div className="bookings-page">
      <div className="bookings-page-heading">
        <div>
          <span className="booking-eyebrow">SERVICE OPERATIONS</span>
          <h1>Service Bookings</h1>
          <p className="bookings-subtitle">Manage appointments, service requests, and workshop progress.</p>
        </div>
        <button type="button" className="booking-button button-primary create-booking-button" onClick={() => setModal({ type: "create", bookingId: makeBookingId(bookings) })}>
          <Plus size={18} /> New booking
        </button>
      </div>

      <div className="booking-data-notice">
        <span />
        Bookings and mechanic assignments are stored locally in this browser.
      </div>

      {notice && (
        <div className={`booking-notice${notice.type === "error" ? " booking-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.type === "error" ? <X size={17} /> : <Check size={17} />}<span>{notice.message}</span>
          <button type="button" className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={17} /></button>
        </div>
      )}

      <section className="booking-summary-grid" aria-label="Booking summary">
        <SummaryCard label="Total bookings" value={summary.total} icon={ClipboardList} tone="blue" />
        <SummaryCard label="Pending bookings" value={summary.pending} icon={Clock3} tone="amber" />
        <SummaryCard label="In progress" value={summary.inProgress} icon={Wrench} tone="violet" />
        <SummaryCard label="Completed bookings" value={summary.completed} icon={Check} tone="green" />
      </section>

      <section className="booking-table-card">
        <div className="booking-table-heading">
          <div>
            <h2>All bookings</h2>
            <p>{visibleBookings.length} {visibleBookings.length === 1 ? "appointment" : "appointments"} found</p>
          </div>
          <button
            type="button"
            className="booking-button button-secondary sort-button"
            onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}
            aria-label={`Sort by date ${sortDirection === "asc" ? "descending" : "ascending"}`}
          >
            {sortDirection === "asc" ? <ArrowUpWideNarrow size={17} /> : <ArrowDownWideNarrow size={17} />}
            Date {sortDirection === "asc" ? "oldest first" : "newest first"}
          </button>
        </div>
        <div className="booking-filters">
          <label className="booking-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, customer, vehicle or service" aria-label="Search bookings" />
          </label>
          <label className="booking-filter-select">
            <span className="visually-hidden">Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="booking-date-filter">
            <CalendarDays size={17} />
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by booking date" />
          </label>
          {(query || statusFilter || dateFilter) && (
            <button type="button" className="clear-filters-button" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
        <div className="booking-table-scroll">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Service type</th>
                <th>Booking date</th>
                <th>Mechanic</th>
                <th>Est. cost</th>
                <th>Status</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map((booking) => (
                <tr key={booking.id}>
                  <td><button type="button" className="booking-id-link" onClick={() => setModal({ type: "view", booking })}>{booking.id}</button></td>
                  <td><strong className="table-primary-text">{booking.customerName}</strong><span className="table-secondary-text">{booking.phone}</span></td>
                  <td><strong className="table-primary-text">{booking.vehicleNumber}</strong><span className="table-secondary-text">{booking.vehicleModel}</span></td>
                  <td>{booking.serviceType}</td>
                  <td>{formatDate(booking.bookingDate)}</td>
                  <td>{getAssignedMechanic(booking, mechanics)?.fullName || "Unassigned"}</td>
                  <td className="cost-cell">{currency.format(booking.estimatedCost)}</td>
                  <td>
                    <label className="visually-hidden" htmlFor={`status-${booking.id}`}>Update status for {booking.id}</label>
                    <select id={`status-${booking.id}`} className={`table-status-select status-${booking.status.toLowerCase().replaceAll(" ", "-")}`} value={booking.status} onChange={(event) => updateStatus(booking.id, event.target.value)}>
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="booking-row-actions">
                      <button type="button" className="icon-button" onClick={() => setModal({ type: "view", booking })} aria-label={`View ${booking.id}`} title="View details"><ClipboardList size={17} /></button>
                      <button type="button" className="icon-button" onClick={() => setModal({ type: "edit", booking })} aria-label={`Edit ${booking.id}`} title="Edit booking"><Pencil size={16} /></button>
                      <button type="button" className="icon-button delete-action" onClick={() => deleteBooking(booking)} aria-label={`Delete ${booking.id}`} title="Delete booking"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleBookings.length === 0 && (
                <tr><td className="booking-empty-state" colSpan="9">{bookings.length === 0 ? "No service bookings found. Create the first booking to get started." : "No bookings match your filters. Try changing your search."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === "create" && <BookingForm bookingId={modal.bookingId} bookings={bookings} mechanics={mechanics} serviceConfiguration={serviceConfiguration} onClose={() => setModal(null)} onSave={saveBooking} />}
      {modal?.type === "edit" && <BookingForm booking={modal.booking} bookings={bookings} mechanics={mechanics} serviceConfiguration={serviceConfiguration} onClose={() => setModal(null)} onSave={saveBooking} />}
      {modal?.type === "view" && (
        <BookingDetails
          booking={modal.booking}
          assignedMechanic={selectedMechanic}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", booking: modal.booking })}
        />
      )}
    </div>
  );
}
