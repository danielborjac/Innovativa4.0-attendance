import React from "react";
import Modal from "react-modal";
Modal.setAppElement("#root");

export default function ConfirmDialog({ message, onCancel, onConfirm }) {
  return (
    <Modal isOpen onRequestClose={onCancel} className="modal" overlayClassName="overlay">
      <h3>Confirmar</h3>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="btn danger" onClick={onConfirm}>Eliminar</button>
        <button className="btn secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </Modal>
  );
}
