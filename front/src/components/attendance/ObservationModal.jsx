// src/components/attendance/ObservationModal.jsx
import React, { useState } from "react";
import Modal from "react-modal";
import axiosClient from "../../api/axiosClient";

Modal.setAppElement("#root");

export default function ObservationModal({ record, onClose, onSaved }) {
  // record contains entryItem and/or exitItem and user
  const entry = record.entryItem;
  const exit = record.exitItem;
  const initialObs = entry?.observation || exit?.observation || "";
  const [text, setText] = useState(initialObs);
  const [saving, setSaving] = useState(false);

  // We will save observation to the entry record if exists, otherwise to exit.
  const targetId = entry?.id || exit?.id;

  const save = async () => {
    if (!targetId) return alert("No hay registro seleccionado para guardar observación.");
    setSaving(true);
    try {
      // Assumes API supports PUT /admin/attendances/{id} with { observation }
      await axiosClient.put(`/admin/attendances/${targetId}`, { observation: text });
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      alert("Error guardando observación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} className="modal" overlayClassName="overlay">
      <h3>Editar Observación</h3>
      <p><strong>Empleado:</strong> {record.user?.name}</p>
      <p><strong>Fecha:</strong> {record.date}</p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} cols={50} style={{ width: "100%" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn" onClick={save} disabled={saving}>Guardar</button>
        <button className="btn secondary" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}
