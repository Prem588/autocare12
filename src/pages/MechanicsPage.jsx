import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/useAppData.js";
import {
  canAcceptMechanicAssignment,
  getAssignedMechanic,
  getLocalDateString,
  isMechanicOnLeaveToday,
} from "../utils/mechanicAvailability.js";
import "./MechanicsPage.css";

const AVAILABILITY_OPTIONS = ["Available", "Busy", "On Leave", "Inactive"];
const SPECIALIZATIONS = [
  "General Service",
  "Engine Repair",
  "Electrical",
  "AC Repair",
  "Brakes",
  "Transmission",
  "Two-Wheeler Service",
];
const EMPTY_MECHANIC = {
  fullName: "",
  phone: "",
  email: "",
  specialization: SPECIALIZATIONS[0],
  experience: "",
  skills: [],
  availability: "Available",
  employmentDate: "",
  address: "",
  leaveStartDate: "",
  leaveEndDate: "",
  leaveReason: "",
};

const ACTIVE_BOOKING_STATUSES = new Set(["Pending", "Confirmed", "In Progress"]);

function bookingAssignedToMechanic(booking, mechanic) {
  return booking.mechanicId
    ? booking.mechanicId === mechanic.id
    : booking.mechanic === mechanic.fullName;
}

function effectiveMechanicStatus(mechanic, bookings, today) {
  if (isMechanicOnLeaveToday(mechanic, today)) return "On Leave Today";
  const isWorking = bookings.some((booking) => (
    booking.status === "In Progress"
    && bookingAssignedToMechanic(booking, mechanic)
    && !["Inactive", "On Leave"].includes(mechanic.availability)
  ));
  return isWorking ? "Working" : mechanic.availability;
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function createMechanicId(mechanics) {
  const takenIds = new Set(mechanics.map((mechanic) => mechanic.id));
  const prefix = `MEC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  let id = prefix;
  let suffix = 1;
  while (takenIds.has(id)) {
    id = `${prefix}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function AvailabilityBadge({ status }) {
  return (
    <span className={`mechanic-status mechanic-status-${status.toLowerCase().replaceAll(" ", "-")}`}>
      <span />
      {status}
    </span>
  );
}

function MechanicAvatar({ name, large = false }) {
  return <span className={`mechanic-avatar${large ? " mechanic-avatar-large" : ""}`}>{initials(name) || "M"}</span>;
}

function MetricCard({ label, value, icon: Icon, tone }) {
  return (
    <article className="mechanic-metric-card">
      <span className={`mechanic-metric-icon mechanic-metric-${tone}`}><Icon size={20} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function MechanicForm({ mechanic, mechanicId, mechanics, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...EMPTY_MECHANIC, ...mechanic }));
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    const phone = values.phone.trim();
    const email = values.email.trim().toLowerCase();
    const experience = Number(values.experience);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mechanics.some((item) => item.email.toLowerCase() === email && item.id !== mechanic?.id)) {
      setError("That email address is already used by another mechanic.");
      return;
    }
    if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
      setError("Experience must be a whole number between 0 and 60 years.");
      return;
    }
    if (Boolean(values.leaveStartDate) !== Boolean(values.leaveEndDate)) {
      setError("Enter both leave dates, or clear the leave dates.");
      return;
    }
    if (values.leaveStartDate && values.leaveEndDate < values.leaveStartDate) {
      setError("Leave end date must be on or after the start date.");
      return;
    }
    const skills = Array.isArray(values.skills)
      ? values.skills
      : values.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    const saveResult = onSave({
      ...values,
      id: mechanic?.id || mechanicId,
      fullName: values.fullName.trim(),
      phone,
      email,
      experience,
      skills,
      address: values.address.trim(),
    });
    if (typeof saveResult === "string") {
      setError(saveResult);
      return;
    }
    setError("");
    await saveResult;
  }

  const skillText = Array.isArray(values.skills) ? values.skills.join(", ") : values.skills;

  return (
    <div className="mechanic-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="mechanic-modal" role="dialog" aria-modal="true" aria-labelledby="mechanic-form-title">
        <div className="mechanic-modal-header">
          <div>
            <span className="mechanic-eyebrow">{mechanic ? "TEAM PROFILE" : "ADD TO YOUR TEAM"}</span>
            <h2 id="mechanic-form-title">{mechanic ? "Edit mechanic" : "Add mechanic"}</h2>
          </div>
          <button type="button" className="mechanic-icon-button" onClick={onClose} aria-label="Close form"><X size={20} /></button>
        </div>
        <div className="mechanic-id-callout">
          <UserRound size={17} />
          <span>Mechanic ID</span>
          <strong>{mechanic?.id || mechanicId}</strong>
        </div>
        {error && <p className="mechanic-form-error" role="alert">{error}</p>}
        <form onSubmit={submitForm}>
          <div className="mechanic-form-grid">
            <label>
              Full name <b>*</b>
              <input name="fullName" value={values.fullName} onChange={updateField} required maxLength={100} placeholder="Full name" />
            </label>
            <label>
              Phone number <b>*</b>
              <input name="phone" type="tel" inputMode="numeric" value={values.phone} onChange={updateField} required maxLength={10} placeholder="10-digit mobile number" />
            </label>
            <label>
              Email address <b>*</b>
              <input name="email" type="email" value={values.email} onChange={updateField} required maxLength={150} placeholder="name@example.com" />
            </label>
            <label>
              Specialization <b>*</b>
              <select name="specialization" value={values.specialization} onChange={updateField} required>
                {SPECIALIZATIONS.map((specialization) => <option key={specialization}>{specialization}</option>)}
              </select>
            </label>
            <label>
              Years of experience <b>*</b>
              <input name="experience" type="number" min="0" max="60" step="1" value={values.experience} onChange={updateField} required placeholder="e.g. 5" />
            </label>
            <label>
              Availability <b>*</b>
              <select name="availability" value={values.availability} onChange={updateField} required>
                {AVAILABILITY_OPTIONS.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label>
              Employment date <b>*</b>
              <input name="employmentDate" type="date" value={values.employmentDate} onChange={updateField} required />
            </label>
            <label>
              Leave start date
              <input name="leaveStartDate" type="date" value={values.leaveStartDate} onChange={updateField} />
            </label>
            <label>
              Leave end date
              <input name="leaveEndDate" type="date" value={values.leaveEndDate} onChange={updateField} min={values.leaveStartDate || undefined} />
            </label>
            <label>
              Leave reason (optional)
              <input name="leaveReason" value={values.leaveReason} onChange={updateField} maxLength={160} placeholder="Reason for leave" />
            </label>
            <label>
              Skills
              <input name="skills" value={skillText} onChange={updateField} placeholder="Diagnostics, brakes, servicing" />
              <small>Separate skills with commas.</small>
            </label>
            <label className="mechanic-address-field">
              Address
              <textarea name="address" value={values.address} onChange={updateField} rows="2" maxLength={250} placeholder="Area, city" />
            </label>
          </div>
          <div className="mechanic-modal-actions">
            {(values.leaveStartDate || values.leaveEndDate || values.leaveReason) && (
              <button
                type="button"
                className="mechanic-button mechanic-button-secondary"
                onClick={() => setValues((current) => ({ ...current, leaveStartDate: "", leaveEndDate: "", leaveReason: "" }))}
              >
                Cancel leave
              </button>
            )}
            <button type="button" className="mechanic-button mechanic-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="mechanic-button mechanic-button-primary"><Check size={17} />{mechanic ? "Save changes" : "Add mechanic"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MechanicProfile({ mechanic, activeBookings, onClose, onEdit, onOpenBooking }) {
  return (
    <div className="mechanic-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="mechanic-modal mechanic-profile-modal" role="dialog" aria-modal="true" aria-labelledby="mechanic-profile-title">
        <div className="mechanic-modal-header">
          <div>
            <span className="mechanic-eyebrow">{mechanic.id}</span>
            <h2 id="mechanic-profile-title">Mechanic profile</h2>
          </div>
          <button type="button" className="mechanic-icon-button" onClick={onClose} aria-label="Close profile"><X size={20} /></button>
        </div>
        <div className="mechanic-profile-banner">
          <MechanicAvatar name={mechanic.fullName} large />
          <div>
            <h3>{mechanic.fullName}</h3>
            <p>{mechanic.specialization}</p>
            <AvailabilityBadge status={isMechanicOnLeaveToday(mechanic) ? "On Leave Today" : mechanic.availability} />
          </div>
        </div>
        <div className="mechanic-profile-grid">
          <ProfileInfo icon={Phone} label="Phone" value={mechanic.phone} />
          <ProfileInfo icon={Mail} label="Email" value={mechanic.email} />
          <ProfileInfo icon={BriefcaseBusiness} label="Experience" value={`${mechanic.experience} years`} />
          <ProfileInfo icon={CalendarDays} label="Employment date" value={formatDate(mechanic.employmentDate)} />
          <ProfileInfo
            icon={CalendarDays}
            label="Leave dates"
            value={mechanic.leaveStartDate && mechanic.leaveEndDate
              ? `${formatDate(mechanic.leaveStartDate)} – ${formatDate(mechanic.leaveEndDate)}`
              : "No leave recorded"}
          />
          <ProfileInfo icon={MapPin} label="Address" value={mechanic.address || "Not provided"} />
          <ProfileInfo icon={Wrench} label="Active bookings" value={activeBookings.length} />
        </div>
        <div className="mechanic-profile-skills">
          <strong>Skills</strong>
          <div>{mechanic.skills.length
            ? mechanic.skills.map((skill) => <span className="mechanic-skill-tag" key={skill}>{skill}</span>)
            : <span className="mechanic-no-skills">No skills added</span>}
          </div>
        </div>
        {activeBookings.length > 0 && (
          <div className="mechanic-profile-bookings">
            <strong>Active assigned bookings</strong>
            {activeBookings.map((booking) => (
              <div key={booking.id}>
                <button type="button" className="mechanic-booking-link" onClick={() => onOpenBooking(booking)}>{booking.id} · {booking.customerName}</button>
                <small>{booking.vehicleNumber} · {booking.serviceType}</small>
              </div>
            ))}
          </div>
        )}
        <div className="mechanic-modal-actions">
          <button type="button" className="mechanic-button mechanic-button-secondary" onClick={onClose}>Close</button>
          <button type="button" className="mechanic-button mechanic-button-primary" onClick={onEdit}>Edit profile</button>
        </div>
      </section>
    </div>
  );
}

function ProfileInfo({ icon: Icon, label, value }) {
  return (
    <div className="mechanic-profile-info">
      <span><Icon size={16} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}

export default function MechanicsPage() {
  const { mechanics, bookings, updateWorkspace } = useAppData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selectedVehicleByMechanic, setSelectedVehicleByMechanic] = useState({});
  const today = getLocalDateString();

  const mechanicWorkloads = useMemo(() => {
    return new Map(mechanics.map((mechanic) => [
      mechanic.id,
      bookings.filter((booking) => (
        ACTIVE_BOOKING_STATUSES.has(booking.status)
        && bookingAssignedToMechanic(booking, mechanic)
      )).length,
    ]));
  }, [bookings, mechanics]);

  const mechanicBookings = useMemo(() => new Map(mechanics.map((mechanic) => [
    mechanic.id,
    bookings.filter((booking) => (
      ACTIVE_BOOKING_STATUSES.has(booking.status) && bookingAssignedToMechanic(booking, mechanic)
    )),
  ])), [bookings, mechanics]);

  function currentBookingFor(mechanic) {
    const assigned = mechanicBookings.get(mechanic.id) || [];
    return [...assigned].sort((a, b) => {
      const priority = { "In Progress": 0, Confirmed: 1, Pending: 2 };
      return priority[a.status] - priority[b.status] || a.bookingDate.localeCompare(b.bookingDate);
    })[0] || null;
  }

  const metrics = useMemo(() => ({
    total: mechanics.length,
    working: mechanics.filter((mechanic) => (
      !isMechanicOnLeaveToday(mechanic, today)
      && !["Inactive", "On Leave"].includes(mechanic.availability)
      && bookings.some((booking) => booking.status === "In Progress" && bookingAssignedToMechanic(booking, mechanic))
    )).length,
    availableNow: mechanics.filter((mechanic) => canAcceptMechanicAssignment(mechanic, today, bookings)).length,
    onLeaveToday: mechanics.filter((mechanic) => isMechanicOnLeaveToday(mechanic, today)).length,
    inactive: mechanics.filter((mechanic) => mechanic.availability === "Inactive").length,
  }), [bookings, mechanics, today]);

  const filteredMechanics = useMemo(() => {
    const term = query.trim().toLowerCase();
    return mechanics
      .filter((mechanic) => !term || [
        mechanic.id, mechanic.fullName, mechanic.phone, mechanic.specialization,
      ].some((value) => value.toLowerCase().includes(term)))
      .filter((mechanic) => !availabilityFilter || effectiveMechanicStatus(mechanic, bookings, today) === availabilityFilter)
      .filter((mechanic) => !specializationFilter || mechanic.specialization === specializationFilter)
      .sort((a, b) => {
        if (sortBy === "experience-desc") return b.experience - a.experience || a.fullName.localeCompare(b.fullName);
        if (sortBy === "experience-asc") return a.experience - b.experience || a.fullName.localeCompare(b.fullName);
        if (sortBy === "name-desc") return b.fullName.localeCompare(a.fullName);
        return a.fullName.localeCompare(b.fullName);
      });
  }, [mechanics, bookings, query, availabilityFilter, specializationFilter, sortBy, today]);

  const assignableBookings = useMemo(() => bookings
    .filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status))
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate)), [bookings]);
  const repairBookings = useMemo(() => bookings
    .filter((booking) => booking.status === "Confirmed" || booking.status === "In Progress")
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate)), [bookings]);
  const unassignedRepairBookings = repairBookings.filter((booking) => (
    !mechanics.some((mechanic) => (
      booking.mechanicId
        ? mechanic.id === booking.mechanicId
        : mechanic.fullName === booking.mechanic
    ))
  ));
  const onLeaveMechanics = mechanics.filter((mechanic) => isMechanicOnLeaveToday(mechanic, today));
  const availableMechanics = mechanics.filter((mechanic) => canAcceptMechanicAssignment(mechanic, today, bookings));

  function saveMechanic(values) {
    const editing = modal.type === "edit";
    let previousMechanic;
    if (editing) {
      previousMechanic = modal.mechanic;
      const activeAssignments = bookings.filter((booking) => (
        bookingAssignedToMechanic(booking, previousMechanic)
        && ACTIVE_BOOKING_STATUSES.has(booking.status)
      ));
      const availabilityBecameUnavailable = values.availability !== "Available"
        && values.availability !== previousMechanic.availability;
      const leaveBecameActive = !isMechanicOnLeaveToday(previousMechanic, today)
        && isMechanicOnLeaveToday(values, today);
      if ((availabilityBecameUnavailable || leaveBecameActive) && activeAssignments.length > 0) {
        return `Reassign ${activeAssignments.length} active booking${activeAssignments.length === 1 ? "" : "s"} before making this mechanic unavailable or recording leave today.`;
      }
    }
    return persistMechanic(values, editing, previousMechanic);
  }

  async function persistMechanic(values, editing, previousMechanic) {
    try {
      await updateWorkspace((current) => ({
        ...current,
        mechanics: editing
          ? current.mechanics.map((item) => item.id === previousMechanic.id ? values : item)
          : [values, ...current.mechanics],
        ...(editing ? {
          bookings: current.bookings.map((booking) => bookingAssignedToMechanic(booking, previousMechanic)
            ? { ...booking, mechanic: values.fullName, mechanicId: values.id }
            : booking),
        } : {}),
      }));
      setNotice({
        type: "success",
        message: editing ? "Mechanic profile updated." : "Mechanic saved in this browser.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function removeMechanic(mechanic) {
    if (!window.confirm(`Delete ${mechanic.fullName}? Any bookings assigned to this mechanic will be unassigned.`)) return;
    try {
      await updateWorkspace((current) => ({
        ...current,
        mechanics: current.mechanics.filter((item) => item.id !== mechanic.id),
        bookings: current.bookings.map((booking) => bookingAssignedToMechanic(booking, mechanic)
          ? { ...booking, mechanic: "Unassigned", mechanicId: "" }
          : booking),
      }));
      setNotice({ type: "success", message: "Mechanic deleted and their bookings unassigned." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function updateBookingAssignment(booking, mechanicId) {
    const mechanic = mechanics.find((item) => item.id === mechanicId);
    const otherBookings = bookings.filter((item) => item.id !== booking.id);
    const alreadyAssigned = mechanic && (
      (booking.mechanicId && booking.mechanicId === mechanic.id)
      || (!booking.mechanicId && booking.mechanic === mechanic.fullName)
    );
    if (mechanicId && !canAcceptMechanicAssignment(mechanic, today, otherBookings) && !alreadyAssigned) {
      setNotice({ type: "error", message: "This mechanic is not eligible for new assignments because of their availability or leave dates." });
      return;
    }
    try {
      await updateWorkspace((current) => ({
        ...current,
        bookings: current.bookings.map((item) => item.id === booking.id
          ? { ...item, mechanic: mechanic?.fullName || "Unassigned", mechanicId: mechanic?.id || "" }
          : item),
      }));
      setNotice({
        type: "success",
        message: !mechanic
          ? `Mechanic unassigned from ${booking.id}.`
          : `${mechanic.fullName} assigned to ${booking.id}.`,
      });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function cancelLeave(mechanic) {
    try {
      await updateWorkspace((current) => ({
        ...current,
        mechanics: current.mechanics.map((item) => item.id === mechanic.id
          ? { ...item, leaveStartDate: "", leaveEndDate: "", leaveReason: "" }
          : item),
      }));
      setNotice({ type: "success", message: `${mechanic.fullName}'s recorded leave was cancelled.` });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  function openBooking(booking) {
    navigate("/bookings", { state: { bookingId: booking.id } });
  }

  function clearFilters() {
    setQuery("");
    setAvailabilityFilter("");
    setSpecializationFilter("");
  }

  return (
    <div className="mechanics-page">
      <div className="mechanics-page-heading">
        <div>
          <span className="mechanic-eyebrow">WORKSHOP TEAM</span>
          <h1>Mechanic Management</h1>
          <p>Manage your workshop team, availability, and booking assignments.</p>
        </div>
        <button type="button" className="mechanic-button mechanic-button-primary add-mechanic-button" onClick={() => setModal({ type: "create", mechanicId: createMechanicId(mechanics) })}>
          <Plus size={18} /> Add mechanic
        </button>
      </div>

      <div className="mechanic-data-notice">
        <span />
        Mechanics and assignments are stored locally in this browser.
      </div>

      {notice && (
        <div className={`mechanic-notice${notice.type === "error" ? " mechanic-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.type === "error" ? <X size={17} /> : <Check size={17} />}<span>{notice.message}</span>
          <button type="button" className="mechanic-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={17} /></button>
        </div>
      )}

      <section className="mechanic-metrics-grid" aria-label="Mechanic summary">
        <MetricCard label="Total mechanics" value={metrics.total} icon={UsersRound} tone="blue" />
        <MetricCard label="Currently working" value={metrics.working} icon={Wrench} tone="amber" />
        <MetricCard label="Available now" value={metrics.availableNow} icon={Check} tone="green" />
        <MetricCard label="On leave today" value={metrics.onLeaveToday} icon={CalendarDays} tone="violet" />
        <MetricCard label="Inactive" value={metrics.inactive} icon={UserRound} tone="slate" />
      </section>

      <section className="mechanic-table-card mechanic-repair-card">
        <div className="mechanic-section-heading">
          <div>
            <h2>Vehicles under repair</h2>
            <p>Confirmed and in-progress bookings only.</p>
          </div>
          <span className="assignment-count">{repairBookings.length} vehicles</span>
        </div>
        <div className="mechanic-table-scroll">
          <table className="mechanic-table repair-table">
            <thead>
              <tr><th>Booking</th><th>Vehicle</th><th>Customer</th><th>Service</th><th>Appointment</th><th>Assigned mechanic</th><th>Status</th></tr>
            </thead>
            <tbody>
              {repairBookings.map((booking) => {
                const currentMechanic = getAssignedMechanic(booking, mechanics);
                const allowedMechanics = mechanics.filter((mechanic) => (
                  canAcceptMechanicAssignment(mechanic, today, bookings.filter((item) => item.id !== booking.id))
                ));
                return (
                  <tr key={booking.id}>
                    <td><button type="button" className="assignment-booking-link" onClick={() => openBooking(booking)}>{booking.id}<ExternalLink size={13} /></button></td>
                    <td><strong className="assignment-customer">{booking.vehicleNumber}</strong><span className="assignment-secondary">{booking.vehicleModel || "Model not recorded"}</span></td>
                    <td>{booking.customerName || "Customer not recorded"}</td>
                    <td>{booking.serviceType}</td>
                    <td>{formatDate(booking.bookingDate)}<span className="assignment-secondary">{booking.timeSlot || "Time not recorded"}</span></td>
                    <td>
                      <label className="visually-hidden" htmlFor={`repair-assignment-${booking.id}`}>Assign mechanic to vehicle {booking.vehicleNumber}</label>
                      <select
                        id={`repair-assignment-${booking.id}`}
                        className={!currentMechanic ? "assignment-select assignment-select-pending" : "assignment-select"}
                        value={currentMechanic?.id || ""}
                        onChange={(event) => updateBookingAssignment(booking, event.target.value)}
                      >
                        <option value="">{currentMechanic ? "Unassigned" : "Needs mechanic assignment"}</option>
                        {currentMechanic && !canAcceptMechanicAssignment(currentMechanic, today, bookings.filter((item) => item.id !== booking.id)) && (
                          <option value={currentMechanic.id}>{currentMechanic.fullName} · {currentMechanic.availability} (current)</option>
                        )}
                        {allowedMechanics.map((mechanic) => (
                          <option key={mechanic.id} value={mechanic.id}>
                            {mechanic.fullName} · {mechanic.id} · {mechanic.specialization} · {mechanic.availability}
                          </option>
                        ))}
                      </select>
                      {!currentMechanic && <span className="assignment-need-label">Needs mechanic assignment</span>}
                    </td>
                    <td><span className={`repair-status repair-status-${booking.status.toLowerCase().replaceAll(" ", "-")}`}>{booking.status}</span></td>
                  </tr>
                );
              })}
              {repairBookings.length === 0 && (
                <tr><td className="mechanic-empty-state" colSpan="7">No vehicles are currently under repair. Only Confirmed and In Progress bookings appear here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mechanic-table-card">
        <div className="mechanic-section-heading">
          <div><h2>Workshop team</h2><p>{filteredMechanics.length} {filteredMechanics.length === 1 ? "mechanic" : "mechanics"}</p></div>
          <label className="mechanic-sort-control">
            <span className="visually-hidden">Sort mechanics</span>
            {sortBy.startsWith("name") ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="experience-desc">Most experienced</option>
              <option value="experience-asc">Least experienced</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
        <div className="mechanic-filters">
          <label className="mechanic-search-control">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, phone or specialization" aria-label="Search mechanics" />
          </label>
          <label className="mechanic-filter-control">
            <span className="visually-hidden">Filter by current status</span>
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
              <option value="">All statuses</option>
              {["Working", "Available", "On Leave Today", "Busy", "On Leave", "Inactive"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          <label className="mechanic-filter-control">
            <span className="visually-hidden">Filter by specialization</span>
            <select value={specializationFilter} onChange={(event) => setSpecializationFilter(event.target.value)}>
              <option value="">All specializations</option>
              {SPECIALIZATIONS.map((specialization) => <option key={specialization}>{specialization}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          {(query || availabilityFilter || specializationFilter) && <button className="mechanic-clear-filters" type="button" onClick={clearFilters}>Clear filters</button>}
        </div>
        <div className="mechanic-table-scroll">
          <table className="mechanic-table">
            <thead>
              <tr>
                <th>Mechanic</th>
                <th>Specialization</th>
                <th>Current status</th>
                <th>Assigned vehicle</th>
                <th>Customer</th>
                <th>Current service</th>
                <th>Active bookings</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredMechanics.map((mechanic) => {
                const currentBooking = currentBookingFor(mechanic);
                const status = effectiveMechanicStatus(mechanic, bookings, today);
                return (
                  <tr key={mechanic.id}>
                    <td>
                      <div className="mechanic-table-person">
                        <MechanicAvatar name={mechanic.fullName} />
                        <div>
                          <button type="button" className="mechanic-name-link" onClick={() => setModal({ type: "view", mechanic })}>{mechanic.fullName}</button>
                          <span>{mechanic.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{mechanic.specialization}</td>
                    <td>
                      <AvailabilityBadge status={status} />
                      <span className="mechanic-admin-availability">Availability: {mechanic.availability}</span>
                    </td>
                    <td>
                      {currentBooking
                        ? <button type="button" className="mechanic-booking-link" onClick={() => openBooking(currentBooking)}>{currentBooking.vehicleNumber || "Vehicle not recorded"}<ExternalLink size={13} /></button>
                        : "—"}
                    </td>
                    <td>{currentBooking?.customerName || "—"}</td>
                    <td>{currentBooking
                      ? <><span>{currentBooking.serviceType}</span><span className="assignment-secondary">{currentBooking.status}</span></>
                      : "—"}</td>
                    <td><span className="mechanic-workload">{mechanicWorkloads.get(mechanic.id) || 0}</span></td>
                    <td>
                      <div className="mechanic-row-actions">
                        <button type="button" className="mechanic-icon-button" onClick={() => setModal({ type: "view", mechanic })} title="View profile" aria-label={`View ${mechanic.fullName}`}><Eye size={16} /></button>
                        <button type="button" className="mechanic-icon-button" onClick={() => setModal({ type: "edit", mechanic })} title="Edit mechanic" aria-label={`Edit ${mechanic.fullName}`}><Wrench size={16} /></button>
                        {currentBooking && <button type="button" className="mechanic-icon-button" onClick={() => openBooking(currentBooking)} title="Open current booking" aria-label={`Open booking ${currentBooking.id}`}><ExternalLink size={16} /></button>}
                        <button type="button" className="mechanic-icon-button mechanic-delete-action" onClick={() => removeMechanic(mechanic)} title="Delete mechanic" aria-label={`Delete ${mechanic.fullName}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMechanics.length === 0 && <tr><td className="mechanic-empty-state" colSpan="8">{mechanics.length === 0 ? "No mechanics added yet. Add a mechanic to start organizing workshop operations." : "No mechanics match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mechanic-table-card mechanic-status-sections">
        <div className="mechanic-section-heading">
          <div>
            <h2>On leave today</h2>
            <p>Only recorded leave periods that include today are shown.</p>
          </div>
          <span className="assignment-count">{onLeaveMechanics.length} mechanics</span>
        </div>
        <div className="mechanic-people-list">
          {onLeaveMechanics.map((mechanic) => (
            <article className="mechanic-person-card" key={mechanic.id}>
              <MechanicAvatar name={mechanic.fullName} />
              <div className="mechanic-person-info">
                <strong>{mechanic.fullName}</strong>
                <span>{mechanic.id} · {mechanic.specialization}</span>
                <small>{formatDate(mechanic.leaveStartDate)} – {formatDate(mechanic.leaveEndDate)}{mechanic.leaveReason ? ` · ${mechanic.leaveReason}` : ""}</small>
              </div>
              <div className="mechanic-person-actions">
                <AvailabilityBadge status="On Leave Today" />
                <button type="button" className="mechanic-button mechanic-button-secondary" onClick={() => cancelLeave(mechanic)}>Cancel leave</button>
                <button type="button" className="mechanic-icon-button" onClick={() => setModal({ type: "edit", mechanic })} aria-label={`Edit ${mechanic.fullName}`}><Wrench size={16} /></button>
              </div>
            </article>
          ))}
          {onLeaveMechanics.length === 0 && <p className="mechanic-section-empty">No mechanic has recorded leave covering today.</p>}
        </div>
      </section>

      <section className="mechanic-table-card mechanic-status-sections">
        <div className="mechanic-section-heading">
          <div>
            <h2>Available mechanics</h2>
            <p>Eligible for new work based on recorded availability and today’s leave dates.</p>
          </div>
          <span className="assignment-count">{availableMechanics.length} available</span>
        </div>
        <div className="mechanic-people-list">
          {availableMechanics.map((mechanic) => {
            const selectedBookingId = selectedVehicleByMechanic[mechanic.id] || "";
            return (
              <article className="mechanic-person-card" key={mechanic.id}>
                <MechanicAvatar name={mechanic.fullName} />
                <div className="mechanic-person-info">
                  <strong>{mechanic.fullName}</strong>
                  <span>{mechanic.id} · {mechanic.specialization}</span>
                  <small>{mechanicWorkloads.get(mechanic.id) || 0} active booking{mechanicWorkloads.get(mechanic.id) === 1 ? "" : "s"}</small>
                </div>
                <div className="mechanic-person-actions">
                  <label className="visually-hidden" htmlFor={`available-vehicle-${mechanic.id}`}>Choose a vehicle to assign to {mechanic.fullName}</label>
                  <select
                    id={`available-vehicle-${mechanic.id}`}
                    className="assignment-select"
                    value={selectedBookingId}
                    onChange={(event) => setSelectedVehicleByMechanic((current) => ({ ...current, [mechanic.id]: event.target.value }))}
                    disabled={unassignedRepairBookings.length === 0}
                  >
                    <option value="">{unassignedRepairBookings.length ? "Select vehicle under repair" : "No unassigned repairs"}</option>
                    {unassignedRepairBookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>{booking.vehicleNumber} · {booking.customerName} · {booking.id}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mechanic-button mechanic-button-primary"
                    disabled={!selectedBookingId}
                    onClick={() => {
                      const booking = unassignedRepairBookings.find((item) => item.id === selectedBookingId);
                      if (booking) updateBookingAssignment(booking, mechanic.id);
                      setSelectedVehicleByMechanic((current) => ({ ...current, [mechanic.id]: "" }));
                    }}
                  >
                    <CarFront size={16} /> Assign vehicle
                  </button>
                </div>
              </article>
            );
          })}
          {availableMechanics.length === 0 && <p className="mechanic-section-empty">No mechanics currently meet the availability and leave-date rules.</p>}
        </div>
      </section>

      <section className="mechanic-table-card mechanic-assignments-card">
        <div className="mechanic-section-heading">
          <div>
            <h2>Booking assignments</h2>
            <p>Assign or reassign active service bookings to available mechanics.</p>
          </div>
          <div className="assignment-heading-actions">
            <span className="assignment-count">{assignableBookings.length} active</span>
            <button type="button" className="mechanic-button mechanic-button-primary" onClick={() => setModal({ type: "create", mechanicId: createMechanicId(mechanics) })}>
              <Plus size={16} /> Add mechanic
            </button>
          </div>
        </div>
        {assignableBookings.length > 0 && availableMechanics.length === 0 && (
          <div className="assignment-empty-eligible" role="status">
            <span>No mechanics are currently eligible for a new assignment. Add a mechanic or update availability and leave dates.</span>
            <button type="button" className="mechanic-button mechanic-button-secondary" onClick={() => setModal({ type: "create", mechanicId: createMechanicId(mechanics) })}>
              Add mechanic
            </button>
          </div>
        )}
        <div className="mechanic-table-scroll">
          <table className="mechanic-table assignment-table">
            <thead>
              <tr><th>Booking</th><th>Customer &amp; vehicle</th><th>Service</th><th>Appointment</th><th>Assigned mechanic</th></tr>
            </thead>
            <tbody>
              {assignableBookings.map((booking) => {
                const currentMechanic = getAssignedMechanic(booking, mechanics);
                const needsAssignment = !currentMechanic;
                const otherBookings = bookings.filter((item) => item.id !== booking.id);
                const allowedMechanics = mechanics.filter((mechanic) => canAcceptMechanicAssignment(mechanic, today, otherBookings));
                const currentMechanicUnavailable = currentMechanic && !canAcceptMechanicAssignment(currentMechanic, today, otherBookings);
                return (
                  <tr key={booking.id}>
                    <td><strong className="assignment-booking-id">{booking.id}</strong><span className={`assignment-need-label${needsAssignment ? "" : " assignment-assigned-label"}`}>{needsAssignment ? "Needs assignment" : booking.status}</span></td>
                    <td><strong className="assignment-customer">{booking.customerName}</strong><span className="assignment-secondary">{booking.vehicleNumber}</span></td>
                    <td>{booking.serviceType}</td>
                    <td>{formatDate(booking.bookingDate)}<span className="assignment-secondary">{booking.timeSlot}</span></td>
                    <td>
                      <label className="visually-hidden" htmlFor={`assignment-${booking.id}`}>Assign mechanic to {booking.id}</label>
                      <select
                        id={`assignment-${booking.id}`}
                        className={needsAssignment ? "assignment-select assignment-select-pending" : "assignment-select"}
                        value={currentMechanic?.id || ""}
                        onChange={(event) => updateBookingAssignment(booking, event.target.value)}
                        aria-describedby={`assignment-current-${booking.id}`}
                      >
                        <option value="">Unassigned</option>
                        {currentMechanicUnavailable && <option value={currentMechanic.id}>{currentMechanic.fullName} · {currentMechanic.specialization} · {effectiveMechanicStatus(currentMechanic, bookings, today)} (current)</option>}
                        {allowedMechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.fullName} · {mechanic.specialization} · {mechanic.id}</option>)}
                      </select>
                      
                        
                      {needsAssignment && availableMechanics.length === 0 && <span className="assignment-need-label">No eligible mechanics available</span>}
                    </td>
                  </tr>
                );
              })}
              {assignableBookings.length === 0 && <tr><td className="mechanic-empty-state" colSpan="5">No active bookings currently need assignment. Create a booking from Service Bookings to add one here.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === "create" && <MechanicForm mechanicId={modal.mechanicId} mechanics={mechanics} onClose={() => setModal(null)} onSave={saveMechanic} />}
      {modal?.type === "edit" && <MechanicForm mechanic={modal.mechanic} mechanics={mechanics} onClose={() => setModal(null)} onSave={saveMechanic} />}
      {modal?.type === "view" && (
        <MechanicProfile
          mechanic={modal.mechanic}
          activeBookings={bookings.filter((booking) => bookingAssignedToMechanic(booking, modal.mechanic) && ACTIVE_BOOKING_STATUSES.has(booking.status))}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", mechanic: modal.mechanic })}
          onOpenBooking={openBooking}
        />
      )}
    </div>
  );
}
