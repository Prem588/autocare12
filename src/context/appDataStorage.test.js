import assert from "node:assert/strict";
import test from "node:test";
import { normalizeInvoices } from "./appDataStorage.js";

test("normalizes legacy invoice parts to an empty array", () => {
  const invoices = normalizeInvoices([
    { id: "INV-1" },
    { id: "INV-2", parts: null },
    { id: "INV-3", parts: [{ partId: "PART-1" }] },
  ]);

  assert.deepEqual(invoices, [
    { id: "INV-1", parts: [] },
    { id: "INV-2", parts: [] },
    { id: "INV-3", parts: [{ partId: "PART-1" }] },
  ]);
});

test("normalizes a non-array invoice collection to an empty array", () => {
  assert.deepEqual(normalizeInvoices(null), []);
});
