// src/components/attendance/AttendanceAdminTable.jsx
import React, { useMemo, useState } from "react";
import { parseEcuadorToMs, formatTimeFromMs, formatDateFromMs, getWeekdayNameFromMs } from "../../utils/dateUtils";
import ObservationModal from "./ObservationModal";

const apiUrl = import.meta.env.VITE_API_URL;

function groupByDay(raw) {
  // raw: array of attendance items. For each day (by recorded_at date) and user, produce combined object
  const map = new Map();
  raw.forEach(item => {
    const ms = parseEcuadorToMs(item.recorded_at);
    const dateKey = formatDateFromMs(ms); // yyyy-mm-dd
    const uid = item.user_id;
    const key = `${uid}__${dateKey}`;
    if (!map.has(key)) {
      map.set(key, { user: item.user, dateKey, entries: [], exits: [] });
    }
    const entry = map.get(key);
    if (item.type === "entry" || item.type === "entrada") entry.entries.push({ ...item, ms });
    else entry.exits.push({ ...item, ms });
  });
  return Array.from(map.values()).sort((a,b) => a.dateKey.localeCompare(b.dateKey));
}

export default function AttendanceAdminTable({ raw = [], loading, onReload }) {
  const [obsOpen, setObsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [hoveredPhoto, setHoveredPhoto] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const grouped = useMemo(() => groupByDay(raw), [raw]);

  const rows = grouped.map(g => {
    // pick earliest entry and latest exit
    const entryItem = g.entries.length ? g.entries.sort((a,b)=>a.ms-b.ms)[0] : null;
    const exitItem = g.exits.length ? g.exits.sort((a,b)=>b.ms-a.ms)[0] : null;
    const entryMs = entryItem?.ms ?? null;
    const exitMs = exitItem?.ms ?? null;
    const hoursWorked = (entryMs != null && exitMs != null) ? ((exitMs - entryMs) / (1000*60*60)) : null;
    return {
      user: g.user,
      dayName: getWeekdayNameFromMs(entryMs ?? exitMs),
      date: g.dateKey,
      entryTime: entryMs ? formatTimeFromMs(entryMs) : "",
      entryCoords: entryItem ? `${entryItem.latitude}, ${entryItem.longitude}` : "",
      entryPhoto: entryItem?.photo_path || null,
      entryId: entryItem?.id || null,
      exitTime: exitMs ? formatTimeFromMs(exitMs) : "",
      exitCoords: exitItem ? `${exitItem.latitude}, ${exitItem.longitude}` : "",
      hoursWorked: hoursWorked != null ? (Math.round(hoursWorked*100)/100) : "",
      contracted_hours: g.user?.contracted_hours ?? "",
      observation: entryItem?.observation || exitItem?.observation || "", // may be null
      rawGroup: g,
      entryItem,
      exitItem
    };
  });

  const openObservation = (record) => {
    setSelectedRecord(record);
    setObsOpen(true);
  };

  return (
    <div className="card">
      {loading ? <div>Cargando...</div> : (      
        <table className="table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Fecha</th>
              <th>Hora ingreso</th>
              <th>Lugar ingreso</th>
              <th>Hora salida</th>
              <th>Lugar salida</th>
              <th>Horas trabajadas</th>
              <th>Horas contrato</th>
              <th>Observaciones</th>
              <th>Foto entrada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="11">Sin registros</td></tr>}
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>{r.dayName}</td>
                <td>{r.date}</td>
                <td>{r.entryTime}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r.entryCoords}</td>
                <td>{r.exitTime}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r.exitCoords}</td>
                <td>{r.hoursWorked}</td>
                <td>{r.contracted_hours}</td>
                <td>{r.observation}</td>
                <td>
                  {r.entryPhoto ? (
                    <a
                      href={`${apiUrl?.replace(/\/$/, "") || "http://localhost:8000"}/storage/${r.entryPhoto}`}
                      target="_blank"
                      rel="noreferrer"
                      onMouseEnter={(e) => {
                        setHoveredPhoto(`${apiUrl?.replace(/\/$/, "") || "http://localhost:8000"}/storage/${r.entryPhoto}`);
                        setHoverPos({ x: e.pageX, y: e.pageY });
                      }}
                      onMouseMove={(e) => setHoverPos({ x: e.pageX, y: e.pageY })}
                      onMouseLeave={() => setHoveredPhoto(null)}
                    >
                      Ver foto
                    </a>
                  ) : "—"}
                </td>
                <td>
                  <button className="btn" onClick={() => openObservation(r)}>Editar obs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>  
      )}

      {obsOpen && selectedRecord && (
        <ObservationModal
          record={selectedRecord}
          onClose={() => { setObsOpen(false); setSelectedRecord(null); }}
          onSaved={() => { setObsOpen(false); setSelectedRecord(null); onReload && onReload(); }}
        />
      )}

      {hoveredPhoto && (
        <div
          className="photo-preview"
          style={{
            position: "absolute",
            top: hoverPos.y + 15,
            left: hoverPos.x + 15,
            border: "1px solid #ccc",
            background: "#fff",
            padding: "4px",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            zIndex: 9999,
          }}
        >
          <img
            src={hoveredPhoto}
            alt="preview"
            style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}
