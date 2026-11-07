import { useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAppData } from "../context/useAppData.js";
import "./InvoicesPage.css";

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];
const STATUS_FILTERS = ["Unpaid", "Partially Paid", "Paid"];
const TODAY = new Date().toISOString().slice(0, 10);
const EMPTY_INVOICE = {
  bookingId: "",
  invoiceDate: TODAY,
  dueDate: "",
  customerName: "",
  customerPhone: "",
  vehicleNumber: "",
  vehicleModel: "",
  mechanic: "",
  serviceDescription: "",
  labourCharges: "0",
  parts: [],
  additionalCharges: "0",
  discount: "0",
  taxRate: "0",
};

const EMPTY_PAYMENT = {
  paymentDate: TODAY,
  amount: "",
  method: PAYMENT_METHODS[0],
  transactionReference: "",
  notes: "",
};

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) : 0;
}

function fromCents(value) {
  return value / 100;
}

function money(value) {
  return CURRENCY.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  return DATE_FORMAT.format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function makeId(prefix, records) {
  const taken = new Set(records.map((record) => record.id));
  const stem = `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  let id = stem;
  let suffix = 1;
  while (taken.has(id)) {
    id = `${stem}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function calculateTotals(values) {
  const partsCents = values.parts.reduce((sum, line) => (
    sum + toCents(line.unitPrice) * Number(line.quantity || 0)
  ), 0);
  const labourCents = toCents(values.labourCharges);
  const additionalCents = toCents(values.additionalCharges);
  const grossCents = partsCents + labourCents + additionalCents;
  const discountCents = toCents(values.discount);
  const taxableCents = Math.max(0, grossCents - discountCents);
  const taxRate = Number(values.taxRate) || 0;
  const taxCents = Math.round(taxableCents * taxRate / 100);
  return {
    parts: fromCents(partsCents),
    subtotal: fromCents(taxableCents),
    taxAmount: fromCents(taxCents),
    total: fromCents(taxableCents + taxCents),
  };
}

function paymentTotal(payments, invoiceId) {
  return fromCents(payments
    .filter((payment) => payment.invoiceId === invoiceId)
    .reduce((sum, payment) => sum + toCents(payment.amount), 0));
}

function paymentStatus(invoice, payments) {
  const paidCents = toCents(paymentTotal(payments, invoice.id));
  const totalCents = toCents(invoice.total);
  if (paidCents >= totalCents && totalCents > 0) return "Paid";
  if (paidCents > 0) return "Partially Paid";
  return "Unpaid";
}

function outstandingBalance(invoice, payments) {
  return fromCents(Math.max(0, toCents(invoice.total) - toCents(paymentTotal(payments, invoice.id))));
}

function PaymentStatusBadge({ status }) {
  return <span className={`invoice-status-badge invoice-status-${status.toLowerCase().replaceAll(" ", "-")}`}><span />{status}</span>;
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <article className="invoice-summary-card">
      <span className={`invoice-summary-icon invoice-summary-${tone}`}><Icon size={20} /></span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </article>
  );
}

function InvoiceForm({ invoice, invoiceNumber, bookings, inventory, serviceConfiguration, paidAmount, onClose, onSave }) {
  const [values, setValues] = useState(() => invoice || {
    ...EMPTY_INVOICE,
    labourCharges: String(serviceConfiguration.defaultLabourCharge),
    taxRate: String(serviceConfiguration.taxRate),
  });
  const [error, setError] = useState("");
  const totals = calculateTotals(values);
  const selectedBooking = bookings.find((booking) => booking.id === values.bookingId);

  function updateField(event) {
    const { name, value } = event.target;
    if (name === "bookingId") {
      const booking = bookings.find((item) => item.id === value);
      setValues((current) => ({
        ...current,
        bookingId: value,
        customerName: booking?.customerName || "",
        customerPhone: booking?.phone || "",
        vehicleNumber: booking?.vehicleNumber || "",
        vehicleModel: booking?.vehicleModel || "",
        mechanic: booking?.mechanic === "Unassigned" ? "" : (booking?.mechanic || ""),
        serviceDescription: booking?.description || "",
        labourCharges: booking?.estimatedCost ? String(booking.estimatedCost) : String(serviceConfiguration.defaultLabourCharge),
      }));
      return;
    }
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateLine(index, field, value) {
    setValues((current) => ({
      ...current,
      parts: current.parts.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        if (field === "partId") {
          const part = inventory.find((item) => item.id === value);
          return {
            ...line,
            partId: value,
            name: part?.name || "",
            sku: part?.sku || "",
            unitPrice: part ? String(part.sellingPrice) : "0",
          };
        }
        return { ...line, [field]: value };
      }),
    }));
  }

  function addLine() {
    setValues((current) => ({
      ...current,
      parts: [...current.parts, { partId: "", name: "", sku: "", quantity: "1", unitPrice: "0" }],
    }));
  }

  function removeLine(index) {
    setValues((current) => ({ ...current, parts: current.parts.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function submitForm(event) {
    event.preventDefault();
    const labour = Number(values.labourCharges);
    const additional = Number(values.additionalCharges);
    const discount = Number(values.discount);
    const taxRate = Number(values.taxRate);
    if (!values.bookingId || !selectedBooking) {
      setError("Select an existing service booking for this invoice.");
      return;
    }
    if (values.dueDate < values.invoiceDate) {
      setError("The due date cannot be earlier than the invoice date.");
      return;
    }
    if (![labour, additional, discount].every((amount) => Number.isFinite(amount) && amount >= 0)) {
      setError("Charges and discount must be valid amounts of zero or more.");
      return;
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      setError("Tax rate must be between 0% and 100%.");
      return;
    }
    if (values.parts.some((line) => (
      !line.partId
      || !Number.isInteger(Number(line.quantity))
      || Number(line.quantity) <= 0
      || !Number.isFinite(Number(line.unitPrice))
      || Number(line.unitPrice) < 0
    ))) {
      setError("Each parts line needs a selected part, positive whole quantity, and valid price.");
      return;
    }
    const calculated = calculateTotals(values);
    if (toCents(discount) > toCents(values.labourCharges)
      + toCents(values.additionalCharges)
      + values.parts.reduce((sum, line) => sum + toCents(line.unitPrice) * Number(line.quantity), 0)) {
      setError("Discount cannot be greater than the invoice subtotal before discount.");
      return;
    }
    if (toCents(calculated.total) < toCents(paidAmount)) {
      setError(`The invoice total cannot be less than the ${money(paidAmount)} already paid.`);
      return;
    }

    setError("");
    onSave({
      ...values,
      id: invoice?.id || invoiceNumber,
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone.trim(),
      vehicleNumber: values.vehicleNumber.trim().toUpperCase(),
      vehicleModel: values.vehicleModel.trim(),
      mechanic: values.mechanic.trim(),
      serviceDescription: values.serviceDescription.trim(),
      labourCharges: Number(values.labourCharges),
      additionalCharges: Number(values.additionalCharges),
      discount: Number(values.discount),
      taxRate,
      parts: values.parts.map((line) => ({
        ...line,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      })),
      ...calculated,
    });
  }

  return (
    <div className="invoice-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="invoice-modal invoice-form-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-form-title">
        <div className="invoice-modal-heading">
          <div><span className="invoice-eyebrow">{invoice ? "UPDATE BILLING" : "NEW BILLING"}</span><h2 id="invoice-form-title">{invoice ? "Edit invoice" : "Create invoice"}</h2></div>
          <button type="button" className="invoice-icon-button" onClick={onClose} aria-label="Close form"><X size={20} /></button>
        </div>
        <div className="invoice-id-callout"><FileText size={17} /><span>Invoice number</span><strong>{invoice?.id || invoiceNumber}</strong></div>
        {error && <p className="invoice-form-error" role="alert">{error}</p>}
        <form onSubmit={submitForm}>
          <div className="invoice-form-grid">
            <label>Service booking <b>*</b>
              <select name="bookingId" value={values.bookingId} onChange={updateField} required>
                <option value="">Select a booking</option>
                {bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} · {booking.customerName} · {booking.vehicleNumber}</option>)}
              </select>
            </label>
            <label>Assigned mechanic<input value={values.mechanic || (selectedBooking?.mechanic === "Unassigned" ? "" : selectedBooking?.mechanic) || ""} readOnly placeholder="Assigned from booking" /></label>
            <label>Invoice date <b>*</b><input name="invoiceDate" type="date" value={values.invoiceDate} onChange={updateField} required /></label>
            <label>Due date <b>*</b><input name="dueDate" type="date" value={values.dueDate} onChange={updateField} required /></label>
            <label>Customer name <b>*</b><input value={values.customerName} readOnly required /></label>
            <label>Customer contact<input value={values.customerPhone} readOnly /></label>
            <label>Vehicle registration<input value={values.vehicleNumber} readOnly /></label>
            <label>Vehicle model<input value={values.vehicleModel} readOnly /></label>
            <label className="invoice-full-width">Service description <b>*</b><textarea name="serviceDescription" value={values.serviceDescription} onChange={updateField} required rows="2" maxLength={500} placeholder="Service carried out" /></label>
          </div>

          <div className="invoice-line-items-heading">
            <div><h3>Spare parts</h3><p>Adding parts to an invoice does not change inventory stock.</p></div>
            <button type="button" className="invoice-button invoice-button-secondary invoice-small-button" onClick={addLine}><Plus size={15} />Add part</button>
          </div>
          {values.parts.length > 0 && (
            <div className="invoice-line-items">
              {values.parts.map((line, index) => (
                <div className="invoice-line-item" key={`${line.partId || "new"}-${index}`}>
                  <label>Part
                    <select value={line.partId} onChange={(event) => updateLine(index, "partId", event.target.value)}>
                      <option value="">Select inventory part</option>
                      {inventory.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.sku}</option>)}
                    </select>
                  </label>
                  <label>Qty<input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></label>
                  <label>Unit price (₹)<input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} /></label>
                  <strong>{money(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</strong>
                  <button type="button" className="invoice-icon-button invoice-remove-line" onClick={() => removeLine(index)} aria-label="Remove part line"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="invoice-form-grid invoice-charges-grid">
            <label>Labour charges (₹) <b>*</b><input name="labourCharges" type="number" min="0" step="0.01" value={values.labourCharges} onChange={updateField} required /></label>
            <label>Additional charges (₹)<input name="additionalCharges" type="number" min="0" step="0.01" value={values.additionalCharges} onChange={updateField} /></label>
            <label>Discount (₹)<input name="discount" type="number" min="0" step="0.01" value={values.discount} onChange={updateField} /></label>
            <label>Tax rate (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value={values.taxRate} onChange={updateField} required /></label>
          </div>
          <div className="invoice-totals-preview">
            <div><span>Parts</span><strong>{money(totals.parts)}</strong></div>
            <div><span>Subtotal after discount</span><strong>{money(totals.subtotal)}</strong></div>
            <div><span>Tax ({Number(values.taxRate) || 0}%)</span><strong>{money(totals.taxAmount)}</strong></div>
            <div className="invoice-total-line"><span>Invoice total</span><strong>{money(totals.total)}</strong></div>
          </div>
          <div className="invoice-modal-actions">
            <button type="button" className="invoice-button invoice-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="invoice-button invoice-button-primary"><Check size={17} />{invoice ? "Save changes" : "Create invoice"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PaymentForm({ invoice, balance, onClose, onSave }) {
  const [values, setValues] = useState(EMPTY_PAYMENT);
  const [error, setError] = useState("");
  const saving = useRef(false);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submitForm(event) {
    event.preventDefault();
    if (saving.current) return;
    const amountCents = toCents(values.amount);
    if (amountCents <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }
    if (amountCents > toCents(balance)) {
      setError(`Payment cannot exceed the outstanding balance of ${money(balance)}.`);
      return;
    }
    saving.current = true;
    onSave({
      invoiceId: invoice.id,
      paymentDate: values.paymentDate,
      amount: fromCents(amountCents),
      method: values.method,
      transactionReference: values.transactionReference.trim(),
      notes: values.notes.trim(),
    });
  }

  return (
    <div className="invoice-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="invoice-modal invoice-payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-form-title">
        <div className="invoice-modal-heading">
          <div><span className="invoice-eyebrow">{invoice.id} · BALANCE {money(balance)}</span><h2 id="payment-form-title">Record payment</h2></div>
          <button type="button" className="invoice-icon-button" onClick={onClose} aria-label="Close payment form"><X size={20} /></button>
        </div>
        {error && <p className="invoice-form-error" role="alert">{error}</p>}
        <form onSubmit={submitForm}>
          <div className="invoice-form-grid">
            <label className="invoice-full-width">Invoice<input value={`${invoice.id} · ${invoice.customerName}`} readOnly /></label>
            <label>Payment date <b>*</b><input name="paymentDate" type="date" value={values.paymentDate} onChange={updateField} required /></label>
            <label>Amount (₹) <b>*</b><input name="amount" type="number" min="0.01" max={balance} step="0.01" value={values.amount} onChange={updateField} required /></label>
            <label>Payment method <b>*</b><select name="method" value={values.method} onChange={updateField}>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
            <label>Transaction reference<input name="transactionReference" value={values.transactionReference} onChange={updateField} maxLength={120} placeholder="UPI / receipt / bank reference" /></label>
            <label className="invoice-full-width">Notes<textarea name="notes" value={values.notes} onChange={updateField} rows="3" maxLength={300} placeholder="Optional payment notes" /></label>
          </div>
          <div className="invoice-payment-balance">Outstanding after this payment: <strong>{money(Math.max(0, balance - (Number(values.amount) || 0)))}</strong></div>
          <div className="invoice-modal-actions">
            <button type="button" className="invoice-button invoice-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="invoice-button invoice-button-primary"><Check size={17} />Save payment</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CompanyDetailsForm({ companyDetails, onClose, onSave }) {
  const [values, setValues] = useState(companyDetails);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submitForm(event) {
    event.preventDefault();
    onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])));
  }

  return (
    <div className="invoice-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="invoice-modal invoice-company-modal" role="dialog" aria-modal="true" aria-labelledby="company-form-title">
        <div className="invoice-modal-heading"><div><span className="invoice-eyebrow">PRINT DETAILS</span><h2 id="company-form-title">Workshop details</h2></div><button type="button" className="invoice-icon-button" onClick={onClose} aria-label="Close company form"><X size={20} /></button></div>
        <form onSubmit={submitForm}>
          <div className="invoice-form-grid">
            <label className="invoice-full-width">Workshop / company name <b>*</b><input name="name" value={values.name} onChange={updateField} required maxLength={120} /></label>
            <label className="invoice-full-width">Address <b>*</b><textarea name="address" value={values.address} onChange={updateField} required rows="2" maxLength={250} /></label>
            <label>Phone<input name="phone" value={values.phone} onChange={updateField} maxLength={40} /></label>
            <label>Email<input name="email" type="email" value={values.email} onChange={updateField} maxLength={120} /></label>
            <label className="invoice-full-width">Tax / registration ID<input name="taxId" value={values.taxId} onChange={updateField} maxLength={100} /></label>
          </div>
          <div className="invoice-modal-actions"><button type="button" className="invoice-button invoice-button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="invoice-button invoice-button-primary"><Check size={17} />Save details</button></div>
        </form>
      </section>
    </div>
  );
}

function InvoiceDetails({ invoice, payments, companyDetails, onClose, onEdit, onPay }) {
  const sortedPayments = [...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  const paid = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
  const balance = fromCents(Math.max(0, toCents(invoice.total) - paid));
  const status = paymentStatus(invoice, payments);
  const overdue = balance > 0 && invoice.dueDate < TODAY;

  return (
    <div className="invoice-modal-backdrop invoice-print-backdrop">
      <section className="invoice-modal invoice-detail-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title">
        <div className="invoice-modal-heading invoice-detail-controls">
          <div><span className="invoice-eyebrow">{invoice.id}</span><h2 id="invoice-detail-title">Invoice details</h2></div>
          <button type="button" className="invoice-icon-button screen-only" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        </div>
        <article className="printable-invoice">
          <div className="print-invoice-header">
            <div><h1>{companyDetails.name}</h1><p>{companyDetails.address}</p><p>{companyDetails.phone} · {companyDetails.email}</p><p>{companyDetails.taxId}</p></div>
            <div className="print-invoice-title"><span>TAX INVOICE</span><strong>{invoice.id}</strong><PaymentStatusBadge status={status} /></div>
          </div>
          <div className="print-invoice-meta">
            <div><small>Invoice date</small><strong>{formatDate(invoice.invoiceDate)}</strong></div>
            <div><small>Due date</small><strong className={overdue ? "invoice-overdue-text" : ""}>{formatDate(invoice.dueDate)}{overdue ? " · OVERDUE" : ""}</strong></div>
          </div>
          <div className="print-invoice-parties">
            <div><span className="print-section-label">BILL TO</span><strong>{invoice.customerName}</strong><span>{invoice.customerPhone}</span></div>
            <div><span className="print-section-label">VEHICLE &amp; SERVICE</span><strong>{invoice.vehicleNumber} · {invoice.vehicleModel}</strong><span>Mechanic: {invoice.mechanic || "Unassigned"}</span><span>{invoice.serviceDescription}</span></div>
          </div>
          <table className="print-invoice-lines">
            <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td>Labour · {invoice.serviceDescription}</td><td>1</td><td>{money(invoice.labourCharges)}</td><td>{money(invoice.labourCharges)}</td></tr>
              {invoice.parts.map((line, index) => <tr key={`${line.partId}-${index}`}><td>{line.name} <small>{line.sku}</small></td><td>{line.quantity}</td><td>{money(line.unitPrice)}</td><td>{money(line.quantity * line.unitPrice)}</td></tr>)}
              {invoice.additionalCharges > 0 && <tr><td>Additional charges</td><td>1</td><td>{money(invoice.additionalCharges)}</td><td>{money(invoice.additionalCharges)}</td></tr>}
            </tbody>
          </table>
          <div className="print-invoice-totals">
            <div><span>Gross subtotal</span><strong>{money(invoice.subtotal + invoice.discount)}</strong></div>
            {invoice.discount > 0 && <div><span>Discount</span><strong>− {money(invoice.discount)}</strong></div>}
            <div><span>Tax ({invoice.taxRate}%)</span><strong>{money(invoice.taxAmount)}</strong></div>
            <div className="print-total"><span>Invoice total</span><strong>{money(invoice.total)}</strong></div>
            <div><span>Amount paid</span><strong>{money(fromCents(paid))}</strong></div>
            <div className="print-balance"><span>Outstanding balance</span><strong>{money(balance)}</strong></div>
          </div>
          <div className="print-payment-history">
            <h3>Payment history</h3>
            {sortedPayments.length ? (
              <table className="print-invoice-lines payment-history-table">
                <thead><tr><th>Date</th><th>Method</th><th>Reference / notes</th><th>Amount</th></tr></thead>
                <tbody>{sortedPayments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paymentDate)}</td><td>{payment.method}</td><td>{[payment.transactionReference, payment.notes].filter(Boolean).join(" · ") || "—"}</td><td>{money(payment.amount)}</td></tr>)}</tbody>
              </table>
            ) : <p>No payments recorded.</p>}
          </div>
          <p className="print-thank-you">Thank you for choosing {companyDetails.name}.</p>
        </article>
        <div className="invoice-modal-actions invoice-detail-actions screen-only">
          <button type="button" className="invoice-button invoice-button-secondary" onClick={() => window.print()}><Printer size={16} />Print invoice</button>
          <button type="button" className="invoice-button invoice-button-secondary" onClick={onEdit}><Pencil size={16} />Edit</button>
          {balance > 0 && <button type="button" className="invoice-button invoice-button-primary" onClick={onPay}><Plus size={16} />Record payment</button>}
        </div>
      </section>
    </div>
  );
}

export default function InvoicesPage() {
  const location = useLocation();
  const {
    invoices,
    payments,
    bookings,
    inventory,
    companyDetails,
    serviceConfiguration,
    updateWorkspace,
  } = useAppData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [modal, setModal] = useState(() => {
    const invoice = invoices.find((item) => item.id === location.state?.invoiceId);
    return invoice ? { type: "view", invoice } : null;
  });
  const [notice, setNotice] = useState(null);

  const invoicePaymentMap = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      const items = map.get(payment.invoiceId) || [];
      items.push(payment);
      map.set(payment.invoiceId, items);
    });
    return map;
  }, [payments]);

  const metrics = useMemo(() => {
    const statuses = invoices.map((invoice) => paymentStatus(invoice, payments));
    return {
      total: invoices.length,
      paid: statuses.filter((status) => status === "Paid").length,
      unpaid: statuses.filter((status) => status === "Unpaid").length,
      partial: statuses.filter((status) => status === "Partially Paid").length,
      revenue: fromCents(payments.reduce((sum, payment) => sum + toCents(payment.amount), 0)),
      outstanding: fromCents(invoices.reduce((sum, invoice) => sum + toCents(outstandingBalance(invoice, payments)), 0)),
    };
  }, [invoices, payments]);

  const visibleInvoices = useMemo(() => {
    const term = query.trim().toLowerCase();
    return invoices
      .filter((invoice) => !term || [
        invoice.id, invoice.customerName, invoice.vehicleNumber,
      ].some((value) => value.toLowerCase().includes(term)))
      .filter((invoice) => !statusFilter || paymentStatus(invoice, payments) === statusFilter)
      .filter((invoice) => !dateFrom || invoice.invoiceDate >= dateFrom)
      .filter((invoice) => !dateTo || invoice.invoiceDate <= dateTo)
      .sort((a, b) => {
        if (sortBy === "date-asc") return a.invoiceDate.localeCompare(b.invoiceDate);
        if (sortBy === "amount-asc") return a.total - b.total || a.invoiceDate.localeCompare(b.invoiceDate);
        if (sortBy === "amount-desc") return b.total - a.total || b.invoiceDate.localeCompare(a.invoiceDate);
        return b.invoiceDate.localeCompare(a.invoiceDate);
      });
  }, [invoices, payments, query, statusFilter, dateFrom, dateTo, sortBy]);

  async function saveInvoice(values) {
    const editing = modal.type === "edit";
    try {
      await updateWorkspace((current) => ({
        ...current,
        invoices: editing
          ? current.invoices.map((invoice) => invoice.id === modal.invoice.id
            ? { ...values, id: invoice.id }
            : invoice)
          : [{ ...values }, ...current.invoices],
      }));
      setNotice({
        type: "success",
        message: editing
          ? "Invoice updated. Existing payment records were preserved."
          : "Invoice created. Inventory stock was not changed.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function deleteInvoice(invoice) {
    const attachedPayments = payments.filter((payment) => payment.invoiceId === invoice.id).length;
    const paymentText = attachedPayments ? ` Its ${attachedPayments} recorded payment(s) will also be deleted.` : "";
    if (!window.confirm(`Delete invoice ${invoice.id}?${paymentText}`)) return;
    try {
      await updateWorkspace((current) => ({
        ...current,
        invoices: current.invoices.filter((item) => item.id !== invoice.id),
        payments: current.payments.filter((payment) => payment.invoiceId !== invoice.id),
      }));
      setNotice({ type: "success", message: "Invoice and its related payment records were deleted." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function recordPayment(values) {
    const currentInvoice = invoices.find((invoice) => invoice.id === values.invoiceId);
    if (!currentInvoice) {
      setNotice({ type: "error", message: "Invoice was not found. No payment was recorded." });
      return;
    }
    const currentBalance = outstandingBalance(currentInvoice, payments);
    if (toCents(values.amount) <= 0 || toCents(values.amount) > toCents(currentBalance)) {
      setNotice({ type: "error", message: "Payment must be greater than zero and cannot exceed the current outstanding balance." });
      return;
    }
    const newPayment = {
      ...values,
      id: makeId("PAY", payments),
      createdAt: new Date().toISOString(),
    };
    try {
      await updateWorkspace((current) => ({
        ...current,
        payments: [newPayment, ...current.payments],
      }));
      setNotice({ type: "success", message: `Payment of ${money(newPayment.amount)} recorded for ${currentInvoice.id}.` });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function saveCompanyDetails(details) {
    try {
      await updateWorkspace((current) => ({ ...current, companyDetails: details }));
      setModal(null);
      setNotice({ type: "success", message: "Workshop details updated for printable invoices." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }

  function invoicePaidAmount(invoice) {
    return paymentTotal(invoicePaymentMap.get(invoice.id) || [], invoice.id);
  }

  return (
    <div className="invoices-page">
      <div className="invoices-page-heading">
        <div><span className="invoice-eyebrow">BILLING &amp; COLLECTIONS</span><h1>Invoices &amp; Payments</h1><p>Prepare service invoices, track collections, and manage outstanding balances.</p></div>
        <div className="invoice-heading-actions">
          <button type="button" className="invoice-button invoice-button-secondary" onClick={() => setModal({ type: "company" })}><Settings2 size={16} />Workshop details</button>
          <button type="button" className="invoice-button invoice-button-primary" onClick={() => setModal({ type: "create", invoiceNumber: makeId("INV", invoices) })}><Plus size={17} />Create invoice</button>
        </div>
      </div>

      <div className="invoice-data-notice"><span />Invoice and payment data is stored locally in this browser.</div>
      {notice && <div className={`invoice-notice${notice.type === "error" ? " invoice-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>{notice.type === "error" ? <X size={17} /> : <Check size={17} />}<span>{notice.message}</span><button type="button" className="invoice-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={17} /></button></div>}

      <section className="invoice-summary-grid" aria-label="Invoice summary">
        <SummaryCard label="Total invoices" value={metrics.total} icon={FileText} tone="blue" />
        <SummaryCard label="Paid invoices" value={metrics.paid} icon={Check} tone="green" />
        <SummaryCard label="Unpaid invoices" value={metrics.unpaid} icon={TrendingDown} tone="red" />
        <SummaryCard label="Partially paid" value={metrics.partial} icon={CircleDollarSign} tone="amber" />
        <SummaryCard label="Revenue received" value={money(metrics.revenue)} icon={TrendingUp} tone="violet" />
        <SummaryCard label="Outstanding balance" value={money(metrics.outstanding)} icon={Wallet} tone="slate" />
      </section>

      <section className="invoice-card">
        <div className="invoice-section-heading">
          <div><h2>Invoice register</h2><p>{visibleInvoices.length} {visibleInvoices.length === 1 ? "invoice" : "invoices"} shown</p></div>
          <label className="invoice-sort-control"><span className="visually-hidden">Sort invoices</span>{sortBy.includes("desc") ? <ArrowDownWideNarrow size={16} /> : <ArrowUpWideNarrow size={16} />}<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="date-desc">Date: newest first</option><option value="date-asc">Date: oldest first</option><option value="amount-desc">Amount: high first</option><option value="amount-asc">Amount: low first</option></select><ChevronDown size={15} /></label>
        </div>
        <div className="invoice-filters">
          <label className="invoice-search-control"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, customer or vehicle" aria-label="Search invoices" /></label>
          <label className="invoice-filter-control"><span className="visually-hidden">Filter by payment status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All payment statuses</option>{STATUS_FILTERS.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label>
          <label className="invoice-date-filter"><CalendarDays size={15} /><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Invoices from date" /></label>
          <label className="invoice-date-filter"><span className="visually-hidden">Through date</span><span>to</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Invoices through date" /></label>
          {(query || statusFilter || dateFrom || dateTo) && <button type="button" className="invoice-clear-filters" onClick={clearFilters}>Clear filters</button>}
        </div>
        {dateFrom && dateTo && dateFrom > dateTo && <p className="invoice-filter-error" role="alert">Start date must be on or before end date.</p>}
        <div className="invoice-table-scroll">
          <table className="invoice-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Vehicle</th><th>Invoice date</th><th>Due date</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {visibleInvoices.map((invoice) => {
                const paid = invoicePaidAmount(invoice);
                const balance = outstandingBalance(invoice, payments);
                const status = paymentStatus(invoice, payments);
                const overdue = balance > 0 && invoice.dueDate < TODAY;
                return (
                  <tr key={invoice.id} className={overdue ? "invoice-row-overdue" : ""}>
                    <td><button type="button" className="invoice-number-link" onClick={() => setModal({ type: "view", invoice })}>{invoice.id}</button>{overdue && <span className="invoice-overdue-label">OVERDUE</span>}</td>
                    <td><strong className="invoice-primary-text">{invoice.customerName}</strong><span className="invoice-secondary-text">{invoice.customerPhone}</span></td>
                    <td><strong className="invoice-primary-text">{invoice.vehicleNumber}</strong><span className="invoice-secondary-text">{invoice.vehicleModel}</span></td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td className={overdue ? "invoice-overdue-text" : ""}>{formatDate(invoice.dueDate)}</td>
                    <td className="invoice-amount-cell">{money(invoice.total)}</td>
                    <td>{money(paid)}</td>
                    <td className={balance > 0 ? "invoice-balance-cell" : ""}>{money(balance)}</td>
                    <td><PaymentStatusBadge status={status} /></td>
                    <td><div className="invoice-row-actions">
                      <button type="button" className="invoice-icon-button" onClick={() => setModal({ type: "view", invoice })} aria-label={`View ${invoice.id}`} title="View invoice"><Eye size={16} /></button>
                      {balance > 0 && <button type="button" className="invoice-icon-button" onClick={() => setModal({ type: "payment", invoice })} aria-label={`Record payment for ${invoice.id}`} title="Record payment"><Wallet size={16} /></button>}
                      <button type="button" className="invoice-icon-button" onClick={() => setModal({ type: "edit", invoice })} aria-label={`Edit ${invoice.id}`} title="Edit invoice"><Pencil size={16} /></button>
                      <button type="button" className="invoice-icon-button invoice-delete-action" onClick={() => deleteInvoice(invoice)} aria-label={`Delete ${invoice.id}`} title="Delete invoice"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                );
              })}
              {visibleInvoices.length === 0 && <tr><td className="invoice-empty-state" colSpan="10">{invoices.length === 0 ? "No invoices created yet. Create a service booking before invoicing." : "No invoices match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === "create" && <InvoiceForm invoiceNumber={modal.invoiceNumber} bookings={bookings} inventory={inventory} serviceConfiguration={serviceConfiguration} onClose={() => setModal(null)} onSave={saveInvoice} />}
      {modal?.type === "edit" && <InvoiceForm invoice={modal.invoice} invoiceNumber={modal.invoice.id} bookings={bookings} inventory={inventory} serviceConfiguration={serviceConfiguration} paidAmount={invoicePaidAmount(modal.invoice)} onClose={() => setModal(null)} onSave={saveInvoice} />}
      {modal?.type === "payment" && <PaymentForm invoice={modal.invoice} balance={outstandingBalance(modal.invoice, payments)} onClose={() => setModal(null)} onSave={recordPayment} />}
      {modal?.type === "company" && <CompanyDetailsForm companyDetails={companyDetails} onClose={() => setModal(null)} onSave={saveCompanyDetails} />}
      {modal?.type === "view" && (
        <InvoiceDetails
          invoice={modal.invoice}
          payments={invoicePaymentMap.get(modal.invoice.id) || []}
          companyDetails={companyDetails}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", invoice: modal.invoice })}
          onPay={() => setModal({ type: "payment", invoice: modal.invoice })}
        />
      )}
    </div>
  );
}
