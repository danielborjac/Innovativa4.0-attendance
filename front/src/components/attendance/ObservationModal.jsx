import React, { useState } from "react";
import Modal from "react-modal";
import axiosClient from "../../api/axiosClient";

Modal.setAppElement("#root");

export default function ObservationModal({ record, onClose, onSaved }) {
  const entry = record.entryItem;
  const exit = record.exitItem;

  // Valores iniciales
  const initialObs = entry?.observation || exit?.observation || "";
  const initialEntryTime = entry?.recorded_at ? entry.recorded_at.substring(11,16) : "";
  const initialExitTime  = exit?.recorded_at ? exit.recorded_at.substring(11,16) : "";

  /**
   * Combina la fecha (YYYY-MM-DD) del registro original con la nueva hora (HH:mm).
   * Utilizamos la fecha de la clave de agrupación (record.date) para la fecha base.
   * @param {string} newTime - La nueva hora (e.g., "17:00")
   * @returns {string} La nueva fecha y hora formateada (YYYY-MM-DD HH:mm:00)
   */
  const mergeDateAndTime = (newTime) => {
    // Usamos record.date que es la clave YYYY-MM-DD de la agrupación.
    const date = record.date; 
    return `${date} ${newTime}:00`;
  };

  const [text, setText] = useState(initialObs);
  const [entryTime, setEntryTime] = useState(initialEntryTime);
  // Permitimos setear exitTime incluso si no existe un registro de salida (para crearlo)
  const [exitTime, setExitTime] = useState(initialExitTime); 
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const entryId = entry?.id;
  const exitId = exit?.id;

  const validateTimes = () => {
    // Simple validación de que la entrada no sea posterior a la salida si ambas existen
    // y están, aparentemente, en el mismo día (según la fecha base del reporte).
    // La lógica de turnos nocturnos anularía esta simple validación, pero la mantenemos
    // para turnos diurnos convencionales.
    if (entryTime && exitTime) {
      if (entryTime > exitTime) {
        // En un caso real de turno nocturno, esta validación debe ser omitida o mejorada, 
        // pero es útil para detectar errores en turnos diurnos.
        return "La hora de entrada no puede ser posterior a la hora de salida para el mismo día de registro.";
      }
    }
    return "";
  };

  const save = async () => {
    const msg = validateTimes();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");

    setSaving(true);
    try {
      const updates = [];
      const newObservation = text;

      // 1. Manejar el registro de ENTRADA (siempre existe si el modal está abierto para una fila con entrada)
      if (entryId) {
        const newEntryRecordedAt = mergeDateAndTime(entryTime);
        
        // Solo enviamos PUT si hay cambios reales en tiempo o observación
        if (newEntryRecordedAt !== entry.recorded_at || newObservation !== entry.observation) {
            updates.push(
                axiosClient.put(`/admin/attendances/${entryId}`, {
                    observation: newObservation,
                    recorded_at: newEntryRecordedAt,
                })
            );
        }
      }

      // 2. Manejar el registro de SALIDA (actualizar o crear)
      if (entry && exitTime) { // Solo si hay hora de salida ingresada y tenemos el registro de entrada base
          const newExitRecordedAt = mergeDateAndTime(exitTime);

          if (exitId) {
            // Caso 2a: ACTUALIZAR registro de salida existente (PUT)
            if (newExitRecordedAt !== exit.recorded_at || newObservation !== exit.observation) {
                updates.push(
                    axiosClient.put(`/admin/attendances/${exitId}`, {
                        observation: newObservation,
                        recorded_at: newExitRecordedAt,
                    })
                );
            }
          } else {
            // Caso 2b: CREAR registro de salida faltante (POST)
            // Solo si entryId existe, usamos sus datos para la creación
            if (entryId) {
                updates.push(
                    axiosClient.post('/admin/attendances', {
                        user_id: entry.user_id,
                        type: 'exit',
                        recorded_at: newExitRecordedAt,
                        observation: newObservation,
                        // Copiamos datos de geolocalización y foto del registro de entrada para la nueva salida
                        latitude: entry.latitude,
                        longitude: entry.longitude,
                        photo_path: entry.photo_path,
                    })
                );
            }
          }
      }


      await Promise.all(updates);

      // Si todo sale bien, llamamos al callback para refrescar la tabla
      onSaved && onSaved();
      onClose(); // Cerrar el modal al finalizar
    } catch (err) {
      console.error("Error al guardar:", err);
      // Usar un mensaje de error en el modal en lugar de alert()
      setError(`Error guardando cambios. Revisa la consola para más detalles. Posible razón: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} className="modal" overlayClassName="overlay">
      <h3>Editar Registro del Día</h3>

      <p><strong>Empleado:</strong> {record.user?.name}</p>
      <p><strong>Fecha:</strong> {record.date}</p>

      {/* Hora de entrada (siempre existe si llegamos hasta aquí, pero validamos por precaución) */}
      {entryId && (
        <div style={{ marginBottom: 12 }}>
          <label><strong>Hora de entrada:</strong></label>
          <input
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            className="input-time"
          />
        </div>
      )}

      {/* Hora de salida (Se muestra siempre si hay entrada para permitir la creación/edición) */}
      {entryId ? (
          <div style={{ marginBottom: 12 }}>
            <label>
                <strong>Hora de salida:</strong>
                {!exitId && exitTime && <span style={{ color: 'blue', marginLeft: '8px', fontWeight: 'bold' }}>(Se creará un nuevo registro)</span>}
                {!exitId && !exitTime && <span style={{ color: 'orange', marginLeft: '8px' }}>(Sin registrar)</span>}
            </label>
            <input
              type="time"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              className="input-time"
            />
          </div>
      ) : (
        <p style={{ color: 'red' }}>Error: No se encontró registro de entrada para editar.</p>
      )}

      {/* Observación */}
      <label><strong>Observación:</strong></label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        style={{ width: "100%" }}
      />

      {/* Mensaje de error */}
      {error && (
        <p style={{ color: "red", marginTop: 8, fontWeight: "bold" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
        </button>
        <button className="btn secondary" onClick={onClose} disabled={saving}>Cancelar</button>
      </div>
    </Modal>
  );
}