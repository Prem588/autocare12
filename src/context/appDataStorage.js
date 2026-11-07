export const APP_DATA_STORAGE_KEY = "autocare-app-data:v1";

export const DEFAULT_USER_PREFERENCES = {
  appearance: "light",
  notifications: {
    bookingUpdates: true,
    lowStockAlerts: true,
    paymentReminders: true,
  },
  dateFormat: "dd MMM yyyy",
  currencyFormat: "en-IN",
};

export const DEFAULT_SERVICE_CONFIGURATION = {
  defaultLabourCharge: 0,
  taxRate: 0,
  bookingDuration: 60,
  serviceTypes: [
    "General Service",
    "Oil Change",
    "Brake Repair",
    "Engine Repair",
    "AC Service",
    "Battery Replacement",
    "Wheel Alignment",
    "Other",
  ],
};

export const EMPTY_COMPANY_DETAILS = {
  name: "",
  logoInitials: "",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  currency: "INR",
};

export function normalizeInvoices(invoices) {
  if (!Array.isArray(invoices)) return [];
  return invoices.map((invoice) => ({
    ...invoice,
    parts: Array.isArray(invoice.parts) ? invoice.parts : [],
  }));
}
