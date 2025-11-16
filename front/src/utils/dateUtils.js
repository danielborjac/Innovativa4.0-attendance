// src/utils/dateUtils.js

export function parseEcuadorToMs(ts) {
  if (!ts) return null;
  const [date, time] = ts.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = (time || "00:00:00").split(":").map(Number);

  // Creamos un objeto Date en hora local
  const localDate = new Date(y, m - 1, d, hh, mm, ss);
  return localDate.getTime();
}

// ✅ formatTimeFromMs - SIN sumar offset
export function formatTimeFromMs(ms) {
  if (ms == null) return "";
  const local = new Date(ms);
  const hh = String(local.getHours()).padStart(2, "0");
  const mm = String(local.getMinutes()).padStart(2, "0");
  const ss = String(local.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatDateFromMs(ms) {
  if (ms == null) return "";
  const ecuadorOffsetMinutes = 5 * 60;
  const local = new Date(ms + ecuadorOffsetMinutes * 60000);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekdayNameFromMs(ms) {
  if (ms == null) return "";
  const ecuadorOffsetMinutes = 5 * 60;
  const local = new Date(ms + ecuadorOffsetMinutes * 60000);
  return local.toLocaleDateString("es-ES", { weekday: "long" });
}
