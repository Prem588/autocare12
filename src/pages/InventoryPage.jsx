import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Eye,
  History,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useAppData } from "../context/useAppData.js";
import "./InventoryPage.css";

const CATEGORIES = [
  "Engine Parts",
  "Brakes",
  "Electrical",
  "Filters",
  "Lubricants",
  "Batteries",
  "Tyres",
  "Accessories",
  "Other",
];
const STOCK_FILTERS = [
  { value: "all", label: "All stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "in-stock", label: "In stock" },
];
const EMPTY_PART = {
  name: "",
  sku: "",
  category: CATEGORIES[0],
  brand: "",
  compatibleModels: [],
  supplierName: "",
  supplierContact: "",
  purchasePrice: "",
  sellingPrice: "",
  stock: "",
  minimumStock: "",
  location: "",
  description: "",
};
const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";
  return DATE_FORMATTER.format(new Date(value));
}

function createPartId(parts) {
  const takenIds = new Set(parts.map((part) => part.id));
  const prefix = `PRT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  let id = prefix;
  let suffix = 1;
  while (takenIds.has(id)) {
    id = `${prefix}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function stockState(part) {
  if (part.stock <= 0) return "out";
  if (part.stock <= part.minimumStock) return "low";
  return "healthy";
}

function StockBadge({ part }) {
  const status = stockState(part);
  const label = status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "In stock";
  return <span className={`inventory-stock-badge stock-${status}`}><span />{label}</span>;
}

function SummaryCard({ label, value, icon: Icon, tone, helper }) {
  return (
    <article className="inventory-summary-card">
      <span className={`inventory-summary-icon summary-${tone}`}><Icon size={20} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {helper && <small>{helper}</small>}
      </div>
    </article>
  );
}

function PartForm({ part, partId, parts, onClose, onSave }) {
  const [values, setValues] = useState(part || EMPTY_PART);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submitForm(event) {
    event.preventDefault();
    const sku = values.sku.trim().toUpperCase();
    const purchasePrice = Number(values.purchasePrice);
    const sellingPrice = Number(values.sellingPrice);
    const stock = Number(values.stock);
    const minimumStock = Number(values.minimumStock);

    if (parts.some((item) => item.sku.toUpperCase() === sku && item.id !== part?.id)) {
      setError("That SKU / part number is already in use.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(values.supplierContact.trim())) {
      setError("Enter a valid 10-digit Indian supplier contact number.");
      return;
    }
    if (![purchasePrice, sellingPrice].every((price) => Number.isFinite(price) && price >= 0)) {
      setError("Purchase and selling prices must be zero or more.");
      return;
    }
    if (![stock, minimumStock].every((quantity) => Number.isInteger(quantity) && quantity >= 0)) {
      setError("Stock and minimum threshold must be whole numbers of zero or more.");
      return;
    }
    const compatibleModels = Array.isArray(values.compatibleModels)
      ? values.compatibleModels
      : values.compatibleModels.split(",").map((model) => model.trim()).filter(Boolean);

    setError("");
    onSave({
      ...values,
      id: part?.id || partId,
      name: values.name.trim(),
      sku,
      brand: values.brand.trim(),
      compatibleModels,
      supplierName: values.supplierName.trim(),
      supplierContact: values.supplierContact.trim(),
      purchasePrice,
      sellingPrice,
      stock,
      minimumStock,
      location: values.location.trim(),
      description: values.description.trim(),
    });
  }

  const compatibleText = Array.isArray(values.compatibleModels)
    ? values.compatibleModels.join(", ")
    : values.compatibleModels;

  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="inventory-modal inventory-part-modal" role="dialog" aria-modal="true" aria-labelledby="part-form-title">
        <div className="inventory-modal-heading">
          <div>
            <span className="inventory-eyebrow">{part ? "PRODUCT DETAILS" : "ADD TO INVENTORY"}</span>
            <h2 id="part-form-title">{part ? "Edit spare part" : "Add spare part"}</h2>
          </div>
          <button type="button" className="inventory-icon-button" onClick={onClose} aria-label="Close form"><X size={20} /></button>
        </div>
        <form className="inventory-part-form" onSubmit={submitForm}>
          <div className="inventory-part-form-scroll">
            <div className="inventory-id-callout"><Package size={17} /><span>Part ID</span><strong>{part?.id || partId}</strong></div>
            {error && <p className="inventory-form-error" role="alert">{error}</p>}
            <div className="inventory-form-grid">
              <label>Part name <b>*</b><input name="name" value={values.name} onChange={updateField} required maxLength={120} placeholder="Spare part name" /></label>
              <label>SKU / part number <b>*</b><input name="sku" value={values.sku} onChange={updateField} required maxLength={60} placeholder="SKU or part number" /></label>
              <label>Category <b>*</b><select name="category" value={values.category} onChange={updateField} required>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Brand <b>*</b><input name="brand" value={values.brand} onChange={updateField} required maxLength={80} placeholder="Brand name" /></label>
              <label>Compatible vehicle models<input name="compatibleModels" value={compatibleText} onChange={updateField} placeholder="Creta, Baleno, City" /><small>Separate models with commas.</small></label>
              <label>Supplier name <b>*</b><input name="supplierName" value={values.supplierName} onChange={updateField} required maxLength={120} placeholder="Supplier business name" /></label>
              <label>Supplier contact <b>*</b><input name="supplierContact" type="tel" inputMode="numeric" value={values.supplierContact} onChange={updateField} required maxLength={10} placeholder="10-digit mobile number" /></label>
              <label>Purchase price (₹) <b>*</b><input name="purchasePrice" type="number" min="0" step="0.01" value={values.purchasePrice} onChange={updateField} required placeholder="0" /></label>
              <label>Selling price (₹) <b>*</b><input name="sellingPrice" type="number" min="0" step="0.01" value={values.sellingPrice} onChange={updateField} required placeholder="0" /></label>
              <label>Current stock <b>*</b><input name="stock" type="number" min="0" step="1" value={values.stock} onChange={updateField} required placeholder="0" disabled={Boolean(part)} /><small>{part ? "Use Stock in or Stock out to change existing stock." : "Opening stock for this new item."}</small></label>
              <label>Minimum stock threshold <b>*</b><input name="minimumStock" type="number" min="0" step="1" value={values.minimumStock} onChange={updateField} required placeholder="0" /></label>
              <label>Storage location<input name="location" value={values.location} onChange={updateField} maxLength={80} placeholder="Storage location" /></label>
              <label className="inventory-description-field">Product description<textarea name="description" value={values.description} onChange={updateField} rows="3" maxLength={500} placeholder="Product details and notes" /></label>
            </div>
          </div>
          <div className="inventory-modal-actions inventory-part-form-actions">
            <button type="button" className="inventory-button inventory-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="inventory-button inventory-button-primary"><Check size={17} />{part ? "Save Changes" : "Save Part"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PartDetails({ part, onClose, onEdit, onStock }) {
  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="inventory-modal inventory-details-modal" role="dialog" aria-modal="true" aria-labelledby="part-details-title">
        <div className="inventory-modal-heading">
          <div><span className="inventory-eyebrow">{part.id} · {part.sku}</span><h2 id="part-details-title">{part.name}</h2></div>
          <button type="button" className="inventory-icon-button" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        </div>
        <div className="inventory-details-status"><StockBadge part={part} /><span>{part.stock} units on hand</span></div>
        <div className="inventory-detail-grid">
          <DetailItem label="Category" value={part.category} />
          <DetailItem label="Brand" value={part.brand} />
          <DetailItem label="Purchase price" value={formatCurrency(part.purchasePrice)} />
          <DetailItem label="Selling price" value={formatCurrency(part.sellingPrice)} />
          <DetailItem label="Minimum threshold" value={`${part.minimumStock} units`} />
          <DetailItem label="Storage location" value={part.location || "Not specified"} />
          <DetailItem label="Supplier" value={part.supplierName} secondary={part.supplierContact} />
          <DetailItem label="Compatible models" value={part.compatibleModels.length ? part.compatibleModels.join(", ") : "Not specified"} />
        </div>
        <div className="inventory-detail-description"><small>Description</small><p>{part.description || "No description provided."}</p></div>
        <div className="inventory-modal-actions">
          <button type="button" className="inventory-button inventory-button-secondary" onClick={onClose}>Close</button>
          <button type="button" className="inventory-button inventory-button-secondary" onClick={onStock}><TrendingUp size={16} />Record stock</button>
          <button type="button" className="inventory-button inventory-button-primary" onClick={onEdit}><Pencil size={16} />Edit part</button>
        </div>
      </section>
    </div>
  );
}

function DetailItem({ label, value, secondary }) {
  return <div className="inventory-detail-item"><small>{label}</small><strong>{value}</strong>{secondary && <span>{secondary}</span>}</div>;
}

function StockOperationForm({ part, bookings, operation, onClose, onSave }) {
  const [quantity, setQuantity] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const isStockIn = operation === "in";

  function submitForm(event) {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a whole quantity greater than zero.");
      return;
    }
    if (!isStockIn && amount > part.stock) {
      setError(`Only ${part.stock} units are available. Stock cannot become negative.`);
      return;
    }
    const selectedBooking = bookings.find((booking) => booking.id === bookingId);
    onSave({
      partId: part.id,
      operation,
      quantity: amount,
      bookingId: selectedBooking?.id || "",
      reference: reference.trim(),
    });
  }

  return (
    <div className="inventory-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="inventory-modal inventory-operation-modal" role="dialog" aria-modal="true" aria-labelledby="stock-operation-title">
        <div className="inventory-modal-heading">
          <div>
            <span className="inventory-eyebrow">{part.sku} · CURRENT STOCK {part.stock}</span>
            <h2 id="stock-operation-title">{isStockIn ? "Record stock in" : "Record stock out"}</h2>
          </div>
          <button type="button" className="inventory-icon-button" onClick={onClose} aria-label="Close stock form"><X size={20} /></button>
        </div>
        {error && <p className="inventory-form-error" role="alert">{error}</p>}
        <form onSubmit={submitForm}>
          <div className="inventory-form-grid">
            <label className="inventory-full-width">Part<input value={part.name} readOnly /></label>
            <label className="inventory-full-width">Quantity <b>*</b><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required placeholder="Enter units" /></label>
            <label className="inventory-full-width">Related service booking (optional)
              <select value={bookingId} onChange={(event) => setBookingId(event.target.value)}>
                <option value="">No booking reference</option>
                {bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} · {booking.customerName} · {booking.vehicleNumber}</option>)}
              </select>
            </label>
            <label className="inventory-full-width">Reference / note (optional)<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} placeholder={isStockIn ? "Supplier invoice or delivery note" : "Job card or usage note"} /></label>
          </div>
          {!isStockIn && <p className="inventory-operation-hint">Stock is deducted only when you confirm this stock-out transaction. Available now: {part.stock} units.</p>}
          <div className="inventory-modal-actions">
            <button type="button" className="inventory-button inventory-button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className={`inventory-button ${isStockIn ? "inventory-button-primary" : "inventory-button-danger"}`}>
              {isStockIn ? <Plus size={17} /> : <Minus size={17} />}{isStockIn ? "Confirm stock in" : "Confirm stock out"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TransactionHistory({ transactions, parts }) {
  const partsById = useMemo(() => new Map(parts.map((part) => [part.id, part])), [parts]);

  return (
    <section className="inventory-card inventory-history-card">
      <div className="inventory-section-heading">
        <div><h2>Stock transaction history</h2><p>Recorded stock movements, newest first.</p></div>
        <span className="inventory-history-count"><History size={15} />{transactions.length} transactions</span>
      </div>
      <div className="inventory-table-scroll">
        <table className="inventory-table inventory-history-table">
          <thead><tr><th>Date</th><th>Part</th><th>Operation</th><th>Quantity</th><th>Reference</th></tr></thead>
          <tbody>
            {transactions.map((transaction) => {
              const part = partsById.get(transaction.partId);
              const reference = [transaction.bookingId, transaction.reference].filter(Boolean).join(" · ") || "—";
              return (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.createdAt)}</td>
                  <td><strong className="inventory-primary-text">{part?.name || "Deleted part"}</strong><span className="inventory-secondary-text">{part?.sku || transaction.partId}</span></td>
                  <td><span className={`inventory-operation-badge operation-${transaction.operation}`}>{transaction.operation === "in" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{transaction.operation === "in" ? "Stock in" : "Stock out"}</span></td>
                  <td className={transaction.operation === "in" ? "transaction-quantity-in" : "transaction-quantity-out"}>{transaction.operation === "in" ? "+" : "−"}{transaction.quantity}</td>
                  <td>{reference}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && <tr><td className="inventory-empty-state" colSpan="5">No stock transactions yet. Use Stock in or Stock out to record a movement.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function InventoryPage() {
  const {
    inventory,
    inventoryTransactions,
    bookings,
    updateWorkspace,
  } = useAppData();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);

  const metrics = useMemo(() => ({
    products: inventory.length,
    units: inventory.reduce((sum, part) => sum + part.stock, 0),
    low: inventory.filter((part) => stockState(part) === "low").length,
    out: inventory.filter((part) => stockState(part) === "out").length,
    value: inventory.reduce((sum, part) => sum + part.purchasePrice * part.stock, 0),
  }), [inventory]);

  const visibleParts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return inventory
      .filter((part) => !term || [
        part.name, part.sku, part.brand, part.category,
      ].some((value) => value.toLowerCase().includes(term)))
      .filter((part) => !categoryFilter || part.category === categoryFilter)
      .filter((part) => stockFilter === "all" || (stockFilter === "low"
        ? stockState(part) === "low"
        : stockFilter === "out"
          ? stockState(part) === "out"
          : stockState(part) === "healthy"))
      .sort((a, b) => {
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "quantity-asc") return a.stock - b.stock || a.name.localeCompare(b.name);
        if (sortBy === "quantity-desc") return b.stock - a.stock || a.name.localeCompare(b.name);
        if (sortBy === "price-asc") return a.sellingPrice - b.sellingPrice || a.name.localeCompare(b.name);
        if (sortBy === "price-desc") return b.sellingPrice - a.sellingPrice || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
  }, [inventory, query, categoryFilter, stockFilter, sortBy]);

  async function savePart(values) {
    const editing = modal.type === "edit";
    try {
      await updateWorkspace((current) => ({
        ...current,
        inventory: editing
          ? current.inventory.map((part) => part.id === modal.part.id
            ? { ...values, id: part.id }
            : part)
          : [{ ...values }, ...current.inventory],
      }));
      setNotice({
        type: "success",
        message: editing ? "Spare part updated." : "Spare part saved in this browser.",
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function deletePart(part) {
    if (!window.confirm(`Delete ${part.name} (${part.sku})? Its transaction history will remain.`)) return;
    try {
      await updateWorkspace((current) => ({
        ...current,
        inventory: current.inventory.filter((item) => item.id !== part.id),
      }));
      setNotice({ type: "success", message: "Spare part deleted. Existing transaction history is preserved." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  async function saveTransaction(transactionData) {
    const part = inventory.find((item) => item.id === transactionData.partId);
    if (!part) {
      setNotice({ type: "error", message: "This part is no longer available. Refresh and try again." });
      return;
    }
    if (transactionData.operation === "out" && transactionData.quantity > part.stock) {
      setNotice({ type: "error", message: `Only ${part.stock} units of ${part.name} are available; no stock was deducted.` });
      return;
    }

    const transaction = {
      ...transactionData,
      id: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const stockChange = transaction.operation === "in" ? transaction.quantity : -transaction.quantity;
    try {
      await updateWorkspace((current) => ({
        ...current,
        inventory: current.inventory.map((item) => item.id === part.id
          ? { ...item, stock: item.stock + stockChange }
          : item),
        inventoryTransactions: [transaction, ...current.inventoryTransactions],
      }));
      setNotice({
        type: "success",
        message: `${transaction.operation === "in" ? "Stock received" : "Stock issued"}: ${transaction.quantity} × ${part.name}.`,
      });
      setModal(null);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  }

  function clearFilters() {
    setQuery("");
    setCategoryFilter("");
    setStockFilter("all");
  }

  return (
    <div className="inventory-page">
      <div className="inventory-page-heading">
        <div>
          <span className="inventory-eyebrow">PARTS &amp; SUPPLIES</span>
          <h1>Inventory Management</h1>
          <p>Track spare parts, stock movements, and inventory value.</p>
        </div>
        <button type="button" className="inventory-button inventory-button-primary" onClick={() => setModal({ type: "create", partId: createPartId(inventory) })}><Plus size={18} />Add spare part</button>
      </div>

      <div className="inventory-data-notice"><span />Inventory and stock transactions are stored locally in this browser.</div>
      {notice && <div className={`inventory-notice${notice.type === "error" ? " inventory-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>{notice.type === "error" ? <X size={17} /> : <Check size={17} />}<span>{notice.message}</span><button type="button" className="inventory-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={17} /></button></div>}

      <section className="inventory-summary-grid" aria-label="Inventory summary">
        <SummaryCard label="Total products" value={metrics.products} icon={Boxes} tone="blue" />
        <SummaryCard label="Total stock units" value={metrics.units} icon={Package} tone="violet" />
        <SummaryCard label="Low-stock items" value={metrics.low} icon={TrendingDown} tone="amber" />
        <SummaryCard label="Out of stock" value={metrics.out} icon={Minus} tone="red" />
        <SummaryCard label="Inventory value" value={formatCurrency(metrics.value)} icon={CircleDollarSign} tone="green" helper="At purchase cost" />
      </section>

      <section className="inventory-card">
        <div className="inventory-section-heading">
          <div><h2>Spare parts</h2><p>{visibleParts.length} {visibleParts.length === 1 ? "product" : "products"} shown</p></div>
          <label className="inventory-sort-control">
            <span className="visually-hidden">Sort inventory</span>
            {sortBy.endsWith("desc") ? <ArrowDownWideNarrow size={16} /> : <ArrowUpWideNarrow size={16} />}
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="quantity-asc">Quantity: low first</option>
              <option value="quantity-desc">Quantity: high first</option>
              <option value="price-asc">Price: low first</option>
              <option value="price-desc">Price: high first</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
        <div className="inventory-filters">
          <label className="inventory-search-control"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, brand or category" aria-label="Search spare parts" /></label>
          <label className="inventory-filter-control"><span className="visually-hidden">Filter by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={15} /></label>
          <label className="inventory-filter-control"><span className="visually-hidden">Filter by stock status</span><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>{STOCK_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select><ChevronDown size={15} /></label>
          {(query || categoryFilter || stockFilter !== "all") && <button className="inventory-clear-filters" type="button" onClick={clearFilters}>Clear filters</button>}
        </div>
        <div className="inventory-table-scroll">
          <table className="inventory-table">
            <thead><tr><th>Part</th><th>Category</th><th>Brand</th><th>Stock</th><th>Purchase price</th><th>Selling price</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {visibleParts.map((part) => (
                <tr key={part.id}>
                  <td><div className="inventory-product-cell"><span className="inventory-product-icon"><Package size={17} /></span><div><button type="button" className="inventory-product-link" onClick={() => setModal({ type: "view", part })}>{part.name}</button><span>{part.id} · {part.sku}</span></div></div></td>
                  <td>{part.category}</td>
                  <td>{part.brand}</td>
                  <td><strong className="inventory-stock-quantity">{part.stock}</strong><span className="inventory-secondary-text">Min. {part.minimumStock}</span></td>
                  <td>{formatCurrency(part.purchasePrice)}</td>
                  <td className="inventory-selling-price">{formatCurrency(part.sellingPrice)}</td>
                  <td><StockBadge part={part} /></td>
                  <td><div className="inventory-row-actions">
                    <button type="button" className="inventory-icon-button" onClick={() => setModal({ type: "view", part })} title="View details" aria-label={`View ${part.name}`}><Eye size={16} /></button>
                    <button type="button" className="inventory-icon-button" onClick={() => setModal({ type: "transaction", part, operation: "in" })} title="Stock in" aria-label={`Stock in ${part.name}`}><TrendingUp size={16} /></button>
                    <button type="button" className="inventory-icon-button" onClick={() => setModal({ type: "transaction", part, operation: "out" })} title="Stock out" aria-label={`Stock out ${part.name}`}><TrendingDown size={16} /></button>
                    <button type="button" className="inventory-icon-button" onClick={() => setModal({ type: "edit", part })} title="Edit part" aria-label={`Edit ${part.name}`}><Pencil size={16} /></button>
                    <button type="button" className="inventory-icon-button inventory-delete-action" onClick={() => deletePart(part)} title="Delete part" aria-label={`Delete ${part.name}`}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}
              {visibleParts.length === 0 && <tr><td className="inventory-empty-state" colSpan="8">{inventory.length === 0 ? "No inventory items available. Add a spare part to get started." : "No inventory items match these filters. Adjust your search."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <TransactionHistory transactions={inventoryTransactions} parts={inventory} />

      {modal?.type === "create" && <PartForm partId={modal.partId} parts={inventory} onClose={() => setModal(null)} onSave={savePart} />}
      {modal?.type === "edit" && <PartForm part={modal.part} parts={inventory} onClose={() => setModal(null)} onSave={savePart} />}
      {modal?.type === "view" && <PartDetails part={modal.part} onClose={() => setModal(null)} onEdit={() => setModal({ type: "edit", part: modal.part })} onStock={() => setModal({ type: "transaction", part: modal.part, operation: "in" })} />}
      {modal?.type === "transaction" && <StockOperationForm part={modal.part} bookings={bookings} operation={modal.operation} onClose={() => setModal(null)} onSave={saveTransaction} />}
    </div>
  );
}
