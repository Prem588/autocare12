import { createContext } from "react";

export const AuthContext = createContext(null);

export const ROLE_NAVIGATION = {
  Admin: ["/", "/vehicles", "/bookings", "/service-history", "/mechanics", "/inventory", "/invoices", "/reminders", "/settings"],
  "Service Manager": ["/", "/vehicles", "/bookings", "/service-history", "/mechanics", "/inventory", "/invoices", "/reminders", "/settings"],
  Mechanic: ["/", "/bookings", "/service-history", "/inventory"],
  Customer: ["/", "/vehicles", "/bookings", "/service-history", "/invoices", "/reminders"],
};

export const AUTH_ROLES = Object.keys(ROLE_NAVIGATION);
