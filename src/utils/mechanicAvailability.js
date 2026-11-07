export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isMechanicOnLeaveToday(mechanic, today = getLocalDateString()) {
  return Boolean(
    mechanic.leaveStartDate
    && mechanic.leaveEndDate
    && mechanic.leaveStartDate <= today
    && mechanic.leaveEndDate >= today,
  );
}

export function getAssignedMechanic(booking, mechanics) {
  if (booking.mechanicId) {
    const mechanicById = mechanics.find((mechanic) => mechanic.id === booking.mechanicId);
    if (mechanicById) return mechanicById;
  }
  return mechanics.find((mechanic) => mechanic.fullName === booking.mechanic) || null;
}

export function canAcceptMechanicAssignment(
  mechanic,
  today = getLocalDateString(),
  bookings = [],
  excludedBookingId = "",
) {
  if (mechanic?.availability !== "Available" || isMechanicOnLeaveToday(mechanic, today)) return false;
  return !bookings.some((booking) => (
    booking.id !== excludedBookingId
    &&
    booking.status === "In Progress"
    && (booking.mechanicId
      ? booking.mechanicId === mechanic.id
      : booking.mechanic === mechanic.fullName)
  ));
}
