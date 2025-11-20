import React, { useState } from "react";
import Modal from "react-modal";
import axiosClient from "../../api/axiosClient";

Modal.setAppElement("#root");

export default function DeleteModal({ onClose, onDeleted }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");

    if (!startDate || !endDate) {
      setError("Por favor, selecciona un rango de fechas.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
        return;
    }

    // Confirmación adicional antes de la eliminación
    const isConfirmed = window.confirm(
      `ATENCIÓN: Estás a punto de ELIMINAR permanentemente todos los registros de asistencia y sus fotos ` +
      `desde ${startDate} hasta ${endDate}. Esta acción es irreversible. ¿Estás seguro?`
    );

    if (!isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      // Usamos el endpoint DELETE que creamos en Laravel
      const res = await axiosClient.delete('/admin/attendances/batch', {
        data: { // DELETE requests envían el cuerpo en 'data'
          start_date: startDate,
          end_date: endDate,
        },
      });

      alert(`✅ Éxito: ${res.data.deleted_records} registros eliminados y ${res.data.deleted_files} fotos borradas.`);
      onDeleted && onDeleted();
      onClose();
    } catch (err) {
      console.error(err);
      setError(`Error al eliminar: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} className="modal" overlayClassName="overlay">
      <h3>🗑️ Eliminar Registros Antiguos</h3>
      <p>Selecciona el rango de fechas para eliminar permanentemente los registros de asistencia y sus fotos asociadas.</p>

      <div style={{ marginBottom: 12 }}>
        <label>
          <strong>Fecha de inicio (Desde):</strong>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ marginLeft: 5 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          <strong>Fecha de fin (Hasta):</strong>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ marginLeft: 5 }}
          />
        </label>
      </div>
      
      {error && (
        <p style={{ color: "red", marginTop: 8, fontWeight: "bold" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button className="btn danger" onClick={handleDelete} disabled={loading || !startDate || !endDate}>
          {loading ? "Eliminando..." : "Eliminar Registros"}
        </button>
      </div>
    </Modal>
  );
}