import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  IndianRupee,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import { useAppData } from "../context/useAppData.js";
import { getAssignedMechanic } from "../utils/mechanicAvailability.js";
import "./ServiceHistoryPage.css";

const BOOKING_STATUSES = ["Completed", "In Progress", "Pending", "Confirmed", "Cancelled"];
const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return "Not recorded";
  return DATE_FORMAT.format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function ServiceHistoryPage() {
  const { bookings, mechanics: mechanicRecords, inventory, inventoryTransactions, invoices, payments, vehicles: registeredVehicles } = useAppData();
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");

  const vehicles = useMemo(() => {
    const byRegistration = new Map();
    registeredVehicles.forEach((vehicle) => {
      byRegistration.set(vehicle.registration, {
        registration: vehicle.registration,
        model: [vehicle.make, vehicle.model].filter(Boolean).join(" "),
        customerName: vehicle.ownerName || "",
        phone: vehicle.ownerPhone || "",
        bookingCount: 0,
      });
    });
    bookings.forEach((booking) => {
      if (!booking.vehicleNumber) return;
      const current = byRegistration.get(booking.vehicleNumber);
      if (!current) {
        byRegistration.set(booking.vehicleNumber, {
          registration: booking.vehicleNumber,
          model: booking.vehicleModel || "",
          customerName: booking.customerName || "",
          phone: booking.phone || "",
          bookingCount: 1,
        });
      } else {
        byRegistration.set(booking.vehicleNumber, {
          ...current,
          model: current.model || booking.vehicleModel || "",
          customerName: current.customerName || booking.customerName || "",
          phone: current.phone || booking.phone || "",
          bookingCount: current.bookingCount + 1,
        });
      }
    });
    return [...byRegistration.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }, [bookings, registeredVehicles]);

  const matchingVehicles = useMemo(() => {
    const query = vehicleQuery.trim().toLowerCase();
    return vehicles.filter((vehicle) => !query || [
      vehicle.registration, vehicle.model, vehicle.customerName,
    ].some((value) => value.toLowerCase().includes(query)));
  }, [vehicles, vehicleQuery]);

  const records = useMemo(() => {
    const invoiceByBooking = new Map(invoices.map((invoice) => [invoice.bookingId, invoice]));
    const inventoryById = new Map(inventory.map((part) => [part.id, part]));
    return bookings.map((booking) => {
      const mechanic = getAssignedMechanic(booking, mechanicRecords);
      const invoice = invoiceByBooking.get(booking.id) || null;
      const invoicePayments = invoice
        ? payments.filter((payment) => payment.invoiceId === invoice.id)
        : [];
      const paid = invoicePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const linkedStockOuts = inventoryTransactions
        .filter((transaction) => transaction.bookingId === booking.id && transaction.operation === "out")
        .map((transaction) => ({
          ...transaction,
          partName: inventoryById.get(transaction.partId)?.name || transaction.partId,
        }));
      const partsFromInvoice = invoice?.parts || [];
      const partsUsed = partsFromInvoice.length
        ? partsFromInvoice.map((line) => `${line.name} × ${line.quantity}`)
        : linkedStockOuts.map((transaction) => `${transaction.partName || transaction.partId} × ${transaction.quantity}`);

      return {
        ...booking,
        mechanic: mechanic?.fullName || booking.mechanic || "Unassigned",
        invoice,
        invoicePayments,
        paid,
        partsUsed,
        hasPartsRecord: partsFromInvoice.length > 0 || linkedStockOuts.length > 0,
        recordedCost: invoice ? Number(invoice.total) : null,
        paymentStatus: invoice
          ? paid >= Number(invoice.total) ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid"
          : null,
      };
    });
  }, [bookings, mechanicRecords, inventory, inventoryTransactions, invoices, payments]);

  const serviceTypes = useMemo(() => [...new Set(bookings.map((booking) => booking.serviceType).filter(Boolean))].sort(), [bookings]);
  const mechanics = useMemo(() => [...new Set(records
    .map((record) => record.mechanic)
    .filter((mechanic) => mechanic && mechanic !== "Unassigned"))].sort(), [records]);

  const visibleRecords = useMemo(() => records
    .filter((record) => !selectedVehicle || record.vehicleNumber === selectedVehicle)
    .filter((record) => !serviceFilter || record.serviceType === serviceFilter)
    .filter((record) => !statusFilter || record.status === statusFilter)
    .filter((record) => !mechanicFilter || record.mechanic === mechanicFilter)
    .filter((record) => !dateFrom || record.bookingDate >= dateFrom)
    .filter((record) => !dateTo || record.bookingDate <= dateTo)
    .sort((a, b) => sortDirection === "asc"
      ? a.bookingDate.localeCompare(b.bookingDate)
      : b.bookingDate.localeCompare(a.bookingDate)), [
    records, selectedVehicle, serviceFilter, statusFilter, mechanicFilter, dateFrom, dateTo, sortDirection,
  ]);

  const selectedVehicleDetails = vehicles.find((vehicle) => vehicle.registration === selectedVehicle);
  const visits = visibleRecords.length;
  const recordedCosts = visibleRecords.reduce((sum, record) => sum + (record.recordedCost || 0), 0);
  const linkedInvoiceCount = visibleRecords.filter((record) => record.invoice).length;

  function clearFilters() {
    setVehicleQuery("");
    setSelectedVehicle("");
    setServiceFilter("");
    setStatusFilter("");
    setMechanicFilter("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="service-history-page">
      <header className="history-page-heading">
        <div>
          <span className="history-eyebrow">CUSTOMER CARE</span>
          <h1>Service History</h1>
          <p>Review booking-linked service records and maintenance work by vehicle.</p>
        </div>
      </header>

      <div className="history-data-notice">
        <span />
        Timelines are built from recorded bookings. Registered vehicle details, invoices, payments, and parts appear only when linked records are available.
      </div>

      <section className="history-vehicle-card">
        <div className="history-vehicle-heading"><CarFront size={20} /><div><h2>Find a vehicle</h2>        <p>Search registered vehicles and vehicles linked to service bookings.</p></div></div>
        <div className="history-vehicle-controls">
          <label className="history-search">
            <Search size={17} />
            <input value={vehicleQuery} onChange={(event) => setVehicleQuery(event.target.value)} placeholder="Search registration, model, or customer" aria-label="Search vehicles" />
          </label>
          <label className="history-select">
            <span className="visually-hidden">Select vehicle</span>
            <select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)}>
              <option value="">All vehicles</option>
              {matchingVehicles.map((vehicle) => <option key={vehicle.registration} value={vehicle.registration}>{vehicle.registration} · {vehicle.model || "Model not recorded"}</option>)}
            </select>
            <ChevronDown size={16} />
          </label>
        </div>
        {selectedVehicleDetails && (
          <div className="history-selected-vehicle">
            <span className="history-car-icon"><CarFront size={21} /></span>
            <div><strong>{selectedVehicleDetails.registration}</strong><span>{selectedVehicleDetails.model || "Model not recorded"}</span></div>
            <div><small>Customer</small><strong>{selectedVehicleDetails.customerName || "Not recorded"}</strong>{selectedVehicleDetails.phone && <span>{selectedVehicleDetails.phone}</span>}</div>
            <div><small>Linked bookings</small><strong>{selectedVehicleDetails.bookingCount}</strong></div>
            <span className="history-linked-tag"><Check size={13} />Booking linked</span>
          </div>
        )}
      </section>

      <section className="history-metrics-grid" aria-label="Service history summary">
        <article className="history-metric-card"><span className="history-metric-icon metric-blue"><ClipboardList size={20} /></span><div><p>Recorded service visits</p><strong>{visits}</strong></div></article>
        <article className="history-metric-card"><span className="history-metric-icon metric-green"><IndianRupee size={20} /></span><div><p>Invoiced service costs</p><strong>{CURRENCY.format(recordedCosts)}</strong><small>From {linkedInvoiceCount} linked invoice{linkedInvoiceCount === 1 ? "" : "s"}</small></div></article>
        <article className="history-metric-card"><span className="history-metric-icon metric-amber"><Clock3 size={20} /></span><div><p>Open service records</p><strong>{visibleRecords.filter((record) => ["Pending", "Confirmed", "In Progress"].includes(record.status)).length}</strong></div></article>
      </section>

      <section className="history-records-card">
        <div className="history-section-heading">
          <div><h2>Service timeline</h2><p>{selectedVehicle || "All vehicles"} · {visibleRecords.length} linked record{visibleRecords.length === 1 ? "" : "s"}</p></div>
          <button type="button" className="history-sort-button" onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>
            {sortDirection === "asc" ? <ArrowUpWideNarrow size={16} /> : <ArrowDownWideNarrow size={16} />}
            {sortDirection === "asc" ? "Oldest first" : "Newest first"}
          </button>
        </div>
        <div className="history-filters">
          <label className="history-filter"><span className="visually-hidden">Filter by service type</span><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="">All service types</option>{serviceTypes.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={15} /></label>
          <label className="history-filter"><span className="visually-hidden">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All booking statuses</option>{BOOKING_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label>
          <label className="history-filter"><span className="visually-hidden">Filter by mechanic</span><select value={mechanicFilter} onChange={(event) => setMechanicFilter(event.target.value)}><option value="">All mechanics</option>{mechanics.map((mechanic) => <option key={mechanic}>{mechanic}</option>)}</select><ChevronDown size={15} /></label>
          <label className="history-date-filter"><CalendarDays size={15} /><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Services from date" /></label>
          <label className="history-date-filter"><span>to</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Services through date" /></label>
          {(selectedVehicle || serviceFilter || statusFilter || mechanicFilter || dateFrom || dateTo || vehicleQuery) && <button type="button" className="history-clear-button" onClick={clearFilters}>Clear filters</button>}
        </div>
        {dateFrom && dateTo && dateFrom > dateTo && <p className="history-filter-error" role="alert">Start date must be on or before end date.</p>}

        {visibleRecords.length ? (
          <div className="service-timeline">
            {visibleRecords.map((record) => (
              <article className="service-timeline-item" key={record.id}>
                <div className="timeline-rail"><span className={`timeline-dot timeline-${record.status.toLowerCase().replaceAll(" ", "-")}`} /></div>
                <div className="service-record-card">
                  <div className="service-record-heading">
                    <div><span className="service-record-date"><CalendarDays size={15} />{formatDate(record.bookingDate)}</span><h3>{record.serviceType || "Service not specified"}</h3></div>
                    <span className={`history-booking-status history-status-${record.status.toLowerCase().replaceAll(" ", "-")}`}>{record.status}</span>
                  </div>
                  <p className="service-record-description">{record.description || <span className="history-missing">Description not recorded</span>}</p>
                  <div className="service-record-meta">
                    <span><CarFront size={14} />{record.vehicleNumber} · {record.vehicleModel || "Model unavailable"}</span>
                    <span><UserRound size={14} />{record.customerName || "Customer not recorded"}</span>
                    <span><Wrench size={14} />{record.mechanic && record.mechanic !== "Unassigned" ? record.mechanic : "Mechanic not assigned"}</span>
                    <span><IndianRupee size={14} />{record.invoice ? CURRENCY.format(record.recordedCost) : `Estimate ${CURRENCY.format(Number(record.estimatedCost) || 0)}`}</span>
                  </div>
                  <div className="service-record-detail-grid">
                    <div><small>Parts used</small><strong>{record.hasPartsRecord ? record.partsUsed.join(", ") : "No linked parts transaction or invoice lines"}</strong></div>
                    <div><small>Labour</small><strong>{record.invoice ? CURRENCY.format(record.invoice.labourCharges || 0) : "Not invoiced"}</strong></div>
                    <div><small>Payment</small><strong>{record.invoice ? record.paymentStatus : "No linked invoice"}</strong></div>
                    <div><small>Booking reference</small><strong>{record.id}</strong></div>
                  </div>
                  <div className="service-record-links">
                    <Link to="/bookings" state={{ bookingId: record.id }} className="history-link-button"><ClipboardList size={15} />Open booking</Link>
                    {record.invoice
                      ? <Link to="/invoices" state={{ invoiceId: record.invoice.id }} className="history-link-button"><FileText size={15} />Open invoice {record.invoice.id}</Link>
                      : <span className="history-unavailable"><FileText size={14} />Invoice unavailable</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="history-empty-state"><ClipboardList size={27} /><strong>{bookings.length === 0 ? "No service history available yet." : "No linked service records found."}</strong><span>{bookings.length === 0 ? "Create a service booking to begin building a vehicle service timeline." : "Try changing the vehicle or filters. History is built from recorded bookings and their linked invoices and stock transactions."}</span></div>
        )}
      </section>
    </div>
  );
}

export default ServiceHistoryPage;
