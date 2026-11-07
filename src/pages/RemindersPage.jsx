import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAppData } from "../context/useAppData.js";
import "./RemindersPage.css";

const CATEGORIES = [
  "Engine oil change",
  "General service",
  "Brake inspection",
  "Tyre replacement or inspection",
  "Battery inspection",
  "Air-conditioning service",
  "Insurance renewal",
  "Pollution certificate renewal",
  "Custom maintenance",
];
const PRIORITIES = ["Low", "Medium", "High"];
const STATUS_FILTERS = ["Upcoming", "Due", "Overdue", "Completed", "Cancelled"];
const EMPTY_REMINDER = {
  vehicleNumber: "",
  title: "",
  description: "",
  category: CATEGORIES[0],
  dueDate: "",
  nextServiceOdometer: "",
  lastServiceDate: "",
  lastServiceOdometer: "",
  priority: "Medium",
  notificationPreferences: { email: false, sms: false, push: false },
};
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return DATE_FORMAT.format(parseLocalDate(value));
}

function dayDifference(dateValue, todayValue = localDateString()) {
  if (!dateValue) return null;
  const due = parseLocalDate(dateValue);
  const today = parseLocalDate(todayValue);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function reminderStatus(reminder, today = localDateString()) {
  if (reminder.completedAt || reminder.status === "Completed") return "Completed";
  if (reminder.status === "Cancelled") return "Cancelled";
  const daysLeft = dayDifference(reminder.dueDate, today);
  if (daysLeft === null) return "Upcoming";
  if (daysLeft < 0) return "Overdue";
  if (daysLeft === 0) return "Due";
  return "Upcoming";
}

function daysLabel(reminder) {
  const daysLeft = dayDifference(reminder.dueDate);
  if (daysLeft === null) return "Date not set";
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
  if (daysLeft === 0) return "Due today";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`;
}

function createReminderId(reminders) {
  const taken = new Set(reminders.map((reminder) => reminder.id));
  const stem = `REM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  let id = stem;
  let suffix = 1;
  while (taken.has(id)) {
    id = `${stem}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function StatusBadge({ status }) {
  return <span className={`reminder-status reminder-status-${status.toLowerCase()}`}><span />{status}</span>;
}

function PriorityBadge({ priority }) {
  return <span className={`reminder-priority priority-${priority.toLowerCase()}`}>{priority}</span>;
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <article className="reminder-summary-card">
      <span className={`reminder-summary-icon reminder-summary-${tone}`}><Icon size={20} /></span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </article>
  );
}

function ReminderForm({ reminder, reminderId, vehicles, onClose, onSave }) {
  const [values, setValues] = useState(reminder || EMPTY_REMINDER);
  const [error, setError] = useState("");
  const selectedVehicle = vehicles.find((vehicle) => vehicle.registration === values.vehicleNumber);

  function updateField(event) {
    const { name, value } = event.target;
    if (name.startsWith("notify-")) {
      const preference = name.slice("notify-".length);
      setValues((current) => ({
        ...current,
        notificationPreferences: {
          ...current.notificationPreferences,
          [preference]: event.target.checked,
        },
      }));
      return;
    }
    if (name === "vehicleNumber") {
      const vehicle = vehicles.find((item) => item.registration === value);
      setValues((current) => ({
        ...current,
        vehicleNumber: value,
        vehicleModel: vehicle?.model || "",
        customerName: vehicle?.customerName || "",
      }));
      return;
    }
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submitForm(event) {
    event.preventDefault();
    const nextOdometer = values.nextServiceOdometer === "" ? "" : Number(values.nextServiceOdometer);
    const lastOdometer = values.lastServiceOdometer === "" ? "" : Number(values.lastServiceOdometer);
    if (!selectedVehicle) {
      setError("Select a vehicle from the service booking records.");
      return;
    }
    if (!values.title.trim() || !values.dueDate) {
      setError("Reminder title and due date are required.");
      return;
    }
    if (values.lastServiceDate && values.lastServiceDate > values.dueDate) {
      setError("Last-service date cannot be later than the reminder due date.");
      return;
    }
    if ([nextOdometer, lastOdometer].some((reading) => reading !== "" && (!Number.isInteger(reading) || reading < 0))) {
      setError("Odometer readings must be whole numbers of zero or more.");
      return;
    }
    if (nextOdometer !== "" && lastOdometer !== "" && nextOdometer < lastOdometer) {
      setError("Next-service odometer must be at least the last-service reading.");
      return;
    }
    setError("");
    onSave({
      ...values,
      id: reminder?.id || reminderId,
      vehicleNumber: selectedVehicle.registration,
      vehicleModel: selectedVehicle.model || "",
      customerName: selectedVehicle.customerName || "",
      title: values.title.trim(),
      description: values.description.trim(),
      nextServiceOdometer: nextOdometer,
      lastServiceOdometer: lastOdometer,
      notificationPreferences: { ...values.notificationPreferences },
    });
  }

  return (
    <div className="reminder-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="reminder-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-form-title">
        <div className="reminder-modal-heading"><div><span className="reminder-eyebrow">{reminder ? "MAINTENANCE SCHEDULE" : "PLAN AHEAD"}</span><h2 id="reminder-form-title">{reminder ? "Edit reminder" : "Create reminder"}</h2></div><button type="button" className="reminder-icon-button" onClick={onClose} aria-label="Close reminder form"><X size={20} /></button></div>
        <div className="reminder-id-callout"><Bell size={17} /><span>Reminder ID</span><strong>{reminder?.id || reminderId}</strong></div>
        {error && <p className="reminder-form-error" role="alert">{error}</p>}
        <form onSubmit={submitForm}>
          <div className="reminder-form-grid">
            <label className="reminder-full-width">Vehicle <b>*</b>
              <select name="vehicleNumber" value={values.vehicleNumber} onChange={updateField} required>
                <option value="">Select a registered vehicle</option>
                {vehicles.map((vehicle) => <option key={vehicle.registration} value={vehicle.registration}>{vehicle.registration} · {vehicle.model || "Model not recorded"}{vehicle.customerName ? ` · ${vehicle.customerName}` : ""}</option>)}
              </select>
              {!vehicles.length && <small>No vehicle records are available. Add a vehicle on the Vehicles page first.</small>}
            </label>
            <label>Reminder title <b>*</b><input name="title" value={values.title} onChange={updateField} required maxLength={120} placeholder="e.g. Engine oil change" /></label>
            <label>Reminder category <b>*</b><select name="category" value={values.category} onChange={updateField} required>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Due date <b>*</b><input name="dueDate" type="date" value={values.dueDate} onChange={updateField} required /></label>
            <label>Priority <b>*</b><select name="priority" value={values.priority} onChange={updateField} required>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            <label>Next-service odometer (optional)<input name="nextServiceOdometer" type="number" min="0" step="1" value={values.nextServiceOdometer} onChange={updateField} placeholder="e.g. 30000 km" /></label>
            <label>Last-service date (optional)<input name="lastServiceDate" type="date" value={values.lastServiceDate} onChange={updateField} /></label>
            <label>Last-service odometer (optional)<input name="lastServiceOdometer" type="number" min="0" step="1" value={values.lastServiceOdometer} onChange={updateField} placeholder="e.g. 20000 km" /></label>
            <label className="reminder-full-width">Description<textarea name="description" value={values.description} onChange={updateField} rows="3" maxLength={500} placeholder="What maintenance is due?" /></label>
          </div>
          <fieldset className="reminder-notification-options">
            <legend>Notification preferences <span>Future integration only; no messages are sent.</span></legend>
            {["email", "sms", "push"].map((method) => (
              <label key={method}><input type="checkbox" name={`notify-${method}`} checked={Boolean(values.notificationPreferences?.[method])} onChange={updateField} />{method.toUpperCase()}</label>
            ))}
          </fieldset>
          {selectedVehicle && values.nextServiceOdometer !== "" && <p className="reminder-mileage-note"><Gauge size={15} />Current odometer is not available for {selectedVehicle.registration}; mileage-based status will not be evaluated.</p>}
          <div className="reminder-modal-actions"><button type="button" className="reminder-button reminder-button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="reminder-button reminder-button-primary"><Check size={17} />{reminder ? "Save changes" : "Create reminder"}</button></div>
        </form>
      </section>
    </div>
  );
}

function ReminderDetails({ reminder, status, vehicle, onClose, onEdit, onComplete, onCancel }) {
  const mileageConfigured = reminder.nextServiceOdometer !== "" && reminder.nextServiceOdometer !== null;
  return (
    <div className="reminder-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="reminder-modal reminder-details-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-details-title">
        <div className="reminder-modal-heading"><div><span className="reminder-eyebrow">{reminder.id}</span><h2 id="reminder-details-title">{reminder.title}</h2></div><button type="button" className="reminder-icon-button" onClick={onClose} aria-label="Close details"><X size={20} /></button></div>
        <div className="reminder-detail-badges"><StatusBadge status={status} /><PriorityBadge priority={reminder.priority} /><span className={`reminder-days${status === "Overdue" ? " reminder-days-overdue" : ""}`}>{daysLabel(reminder)}</span></div>
        <div className="reminder-details-grid">
          <DetailItem label="Vehicle" value={reminder.vehicleNumber} secondary={`${reminder.vehicleModel || "Model not recorded"} · ${vehicle?.customerName || reminder.customerName || "Customer not recorded"}`} />
          <DetailItem label="Category" value={reminder.category} />
          <DetailItem label="Due date" value={formatDate(reminder.dueDate)} />
          <DetailItem label="Next-service odometer" value={mileageConfigured ? `${Number(reminder.nextServiceOdometer).toLocaleString("en-IN")} km` : "Not set"} secondary={mileageConfigured ? "Current odometer unavailable; mileage alert not evaluated." : undefined} />
          <DetailItem label="Last service date" value={formatDate(reminder.lastServiceDate)} />
          <DetailItem label="Last-service odometer" value={reminder.lastServiceOdometer === "" ? "Not recorded" : `${Number(reminder.lastServiceOdometer).toLocaleString("en-IN")} km`} />
          <DetailItem label="Notifications" value={["email", "sms", "push"].filter((key) => reminder.notificationPreferences?.[key]).map((key) => key.toUpperCase()).join(", ") || "None selected"} secondary="Preferences saved only; sending is not configured." />
          <DetailItem label="Description" value={reminder.description || "No description provided"} />
        </div>
        {reminder.completedAt && <p className="reminder-completed-note">Marked completed on {formatDate(reminder.completedAt)}.</p>}
        <div className="reminder-modal-actions">
          <button type="button" className="reminder-button reminder-button-secondary" onClick={onClose}>Close</button>
          {!["Completed", "Cancelled"].includes(status) && <button type="button" className="reminder-button reminder-button-secondary" onClick={onCancel}>Cancel reminder</button>}
          {!["Completed", "Cancelled"].includes(status) && <button type="button" className="reminder-button reminder-button-success" onClick={onComplete}><CheckCircle2 size={16} />Mark complete</button>}
          <button type="button" className="reminder-button reminder-button-primary" onClick={onEdit}><Pencil size={16} />Edit</button>
        </div>
      </section>
    </div>
  );
}

function DetailItem({ label, value, secondary }) {
  return <div className="reminder-detail-item"><small>{label}</small><strong>{value}</strong>{secondary && <span>{secondary}</span>}</div>;
}

export default function RemindersPage() {
  const { bookings, vehicles: registeredVehicles, maintenanceReminders, updateWorkspace } = useAppData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const today = localDateString();

  const vehicles = useMemo(() => {
    const map = new Map();
    registeredVehicles.forEach((vehicle) => {
      map.set(vehicle.registration, {
        registration: vehicle.registration,
        model: [vehicle.make, vehicle.model].filter(Boolean).join(" "),
        customerName: vehicle.ownerName || "",
      });
    });
    bookings.forEach((booking) => {
      if (!booking.vehicleNumber) return;
      if (!map.has(booking.vehicleNumber)) {
        map.set(booking.vehicleNumber, {
          registration: booking.vehicleNumber,
          model: booking.vehicleModel || "",
          customerName: booking.customerName || "",
        });
      }
    });
    return [...map.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }, [bookings, registeredVehicles]);

  const statusCounts = useMemo(() => maintenanceReminders.reduce((counts, reminder) => {
    const status = reminderStatus(reminder, today);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {}), [maintenanceReminders, today]);

  const visibleReminders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return maintenanceReminders
      .filter((reminder) => {
        const vehicle = vehicles.find((item) => item.registration === reminder.vehicleNumber);
        return !term || [
          reminder.vehicleNumber, reminder.vehicleModel, reminder.customerName,
          vehicle?.customerName || "", reminder.title,
        ].some((value) => value.toLowerCase().includes(term));
      })
      .filter((reminder) => !statusFilter || reminderStatus(reminder, today) === statusFilter)
      .filter((reminder) => !priorityFilter || reminder.priority === priorityFilter)
      .filter((reminder) => !categoryFilter || reminder.category === categoryFilter)
      .sort((a, b) => sortDirection === "asc"
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate));
  }, [
    maintenanceReminders, vehicles, query, statusFilter, priorityFilter, categoryFilter, sortDirection, today,
  ]);

  async function saveReminder(values) {
    const editing = modal.type === "edit";
    try {
      await updateWorkspace((current) => ({
        ...current,
        maintenanceReminders: editing
          ? current.maintenanceReminders.map((reminder) => reminder.id === modal.reminder.id
            ? { ...values, id: reminder.id, status: reminder.status, completedAt: reminder.completedAt }
            : reminder)
          : [{
            ...values,
            status: "Upcoming",
            createdAt: new Date().toISOString(),
          }, ...current.maintenanceReminders],
      }));
      setNotice({
        type: "success",
        message: editing
          ? "Maintenance reminder updated."
          : "Reminder created. Notification preferences are saved, but no messages are sent.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function setReminderState(reminder, status) {
    try {
      await updateWorkspace((current) => ({
        ...current,
        maintenanceReminders: current.maintenanceReminders.map((item) => item.id === reminder.id
          ? {
            ...item,
            status,
            completedAt: status === "Completed" ? localDateString() : "",
          }
          : item),
      }));
      setNotice({
        type: "success",
        message: status === "Completed" ? "Reminder marked completed." : "Reminder cancelled.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function deleteReminder(reminder) {
    if (!window.confirm(`Delete reminder "${reminder.title}" for ${reminder.vehicleNumber}?`)) return;
    try {
      await updateWorkspace((current) => ({
        ...current,
        maintenanceReminders: current.maintenanceReminders.filter((item) => item.id !== reminder.id),
      }));
      setNotice({ type: "success", message: "Reminder deleted." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
  }

  return (
    <div className="reminders-page">
      <div className="reminders-page-heading">
        <div><span className="reminder-eyebrow">PROACTIVE VEHICLE CARE</span><h1>Maintenance Reminders</h1><p>Schedule service follow-ups by date and keep odometer targets visible.</p></div>
        <button type="button" className="reminder-button reminder-button-primary" onClick={() => setModal({ type: "create", reminderId: createReminderId(maintenanceReminders) })}><Plus size={18} />Create reminder</button>
      </div>

      <div className="reminder-data-notice"><span />Reminder records are stored locally in this browser. Notification delivery is not configured; mileage alerts need current odometer readings.</div>
      {notice && <div className={`reminder-notice${notice.type === "error" ? " reminder-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>{notice.type === "error" ? <X size={17} /> : <Check size={17} />}<span>{notice.message}</span><button type="button" className="reminder-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={17} /></button></div>}

      <section className="reminder-summary-grid" aria-label="Reminder summary">
        <SummaryCard label="Upcoming" value={statusCounts.Upcoming || 0} icon={CalendarDays} tone="blue" />
        <SummaryCard label="Due today" value={statusCounts.Due || 0} icon={Clock3} tone="amber" />
        <SummaryCard label="Overdue" value={statusCounts.Overdue || 0} icon={Bell} tone="red" />
        <SummaryCard label="Completed" value={statusCounts.Completed || 0} icon={CheckCircle2} tone="green" />
      </section>

      <section className="reminder-card">
        <div className="reminder-section-heading">
          <div><h2>Scheduled maintenance</h2><p>{visibleReminders.length} {visibleReminders.length === 1 ? "reminder" : "reminders"} shown</p></div>
          <button type="button" className="reminder-sort-button" onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}><ArrowDownWideNarrow size={16} />Due date {sortDirection === "asc" ? "soonest first" : "latest first"}<ChevronDown size={14} /></button>
        </div>
        <div className="reminder-filters">
          <label className="reminder-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, vehicle, registration" aria-label="Search reminders" /></label>
          <label className="reminder-filter"><span className="visually-hidden">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{STATUS_FILTERS.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label>
          <label className="reminder-filter"><span className="visually-hidden">Filter by priority</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">All priorities</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><ChevronDown size={15} /></label>
          <label className="reminder-filter"><span className="visually-hidden">Filter by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={15} /></label>
          {(query || statusFilter || priorityFilter || categoryFilter) && <button type="button" className="reminder-clear-filters" onClick={clearFilters}>Clear filters</button>}
        </div>
        <div className="reminder-table-scroll">
          <table className="reminder-table">
            <thead><tr><th>Reminder</th><th>Vehicle</th><th>Category</th><th>Due</th><th>Odometer target</th><th>Priority</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {visibleReminders.map((reminder) => {
                const status = reminderStatus(reminder, today);
                const vehicle = vehicles.find((item) => item.registration === reminder.vehicleNumber);
                const hasMileage = reminder.nextServiceOdometer !== "" && reminder.nextServiceOdometer !== null;
                return (
                  <tr key={reminder.id} className={status === "Overdue" ? "reminder-row-overdue" : ""}>
                    <td><button type="button" className="reminder-title-link" onClick={() => setModal({ type: "view", reminder })}>{reminder.title}</button><span className="reminder-secondary">{reminder.id}</span></td>
                    <td><strong className="reminder-primary-text">{reminder.vehicleNumber}</strong><span className="reminder-secondary">{reminder.vehicleModel || vehicle?.model || "Model not recorded"}{vehicle?.customerName ? ` · ${vehicle.customerName}` : ""}</span></td>
                    <td>{reminder.category}</td>
                    <td><strong className={status === "Overdue" ? "reminder-overdue-text" : ""}>{formatDate(reminder.dueDate)}</strong><span className={`reminder-secondary${status === "Overdue" ? " reminder-overdue-text" : ""}`}>{daysLabel(reminder)}</span></td>
                    <td>{hasMileage ? <><span className="reminder-odometer-value"><Gauge size={13} />{Number(reminder.nextServiceOdometer).toLocaleString("en-IN")} km</span><span className="reminder-secondary">Current odometer unavailable</span></> : "Date-based"}</td>
                    <td><PriorityBadge priority={reminder.priority} /></td>
                    <td><StatusBadge status={status} /></td>
                    <td><div className="reminder-row-actions">
                      <button type="button" className="reminder-icon-button" onClick={() => setModal({ type: "view", reminder })} aria-label={`View ${reminder.title}`} title="View reminder"><Bell size={15} /></button>
                      <button type="button" className="reminder-icon-button" onClick={() => setModal({ type: "edit", reminder })} aria-label={`Edit ${reminder.title}`} title="Edit reminder"><Pencil size={15} /></button>
                      {!["Completed", "Cancelled"].includes(status) && <button type="button" className="reminder-icon-button reminder-complete-action" onClick={() => setReminderState(reminder, "Completed")} aria-label={`Complete ${reminder.title}`} title="Mark complete"><CheckCircle2 size={15} /></button>}
                      <button type="button" className="reminder-icon-button reminder-delete-action" onClick={() => deleteReminder(reminder)} aria-label={`Delete ${reminder.title}`} title="Delete reminder"><Trash2 size={15} /></button>
                    </div></td>
                  </tr>
                );
              })}
              {visibleReminders.length === 0 && <tr><td className="reminder-empty-state" colSpan="8">{maintenanceReminders.length === 0 ? "No maintenance reminders scheduled." : "No reminders match your filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === "create" && <ReminderForm reminderId={modal.reminderId} vehicles={vehicles} onClose={() => setModal(null)} onSave={saveReminder} />}
      {modal?.type === "edit" && <ReminderForm reminder={modal.reminder} vehicles={vehicles} onClose={() => setModal(null)} onSave={saveReminder} />}
      {modal?.type === "view" && (
        <ReminderDetails
          reminder={modal.reminder}
          status={reminderStatus(modal.reminder, today)}
          vehicle={vehicles.find((item) => item.registration === modal.reminder.vehicleNumber)}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", reminder: modal.reminder })}
          onComplete={() => setReminderState(modal.reminder, "Completed")}
          onCancel={() => setReminderState(modal.reminder, "Cancelled")}
        />
      )}
    </div>
  );
}
