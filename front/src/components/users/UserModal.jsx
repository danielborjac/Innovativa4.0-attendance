import React, { useState, useEffect } from "react";
import Modal from "react-modal";

Modal.setAppElement("#root");

export default function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user && !!user.id;
  const [form, setForm] = useState({
    id: user?.id || "",
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "user",
    password: "",
    password_confirmation: "",
  });
  const [err, setErr] = useState(null);
  useEffect(() => {
    setForm({
      id: user?.id || "",
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "user",
      password: "",
      password_confirmation: "",
    });
  }, [user]);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      // simple validations
      if (!form.name || !form.email) throw new Error("Rellena nombre y email");
      if (!isEdit && (!form.password || form.password !== form.password_confirmation)) throw new Error("Contraseñas no coinciden o faltan");
      await onSave(form, isEdit);
    } catch (error) {
      setErr(error.response?.data?.message || error.message || "Error");
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} className="modal" overlayClassName="overlay">
      <h3>{isEdit ? "Editar usuario" : "Crear usuario"}</h3>
      {err && <div className="alert">{err}</div>}
      <form onSubmit={submit}>
        <label>Nombre</label>
        <input name="name" value={form.name} onChange={handle} />
        <label>Email</label>
        <input name="email" value={form.email} onChange={handle} />
        <label>Rol</label>
        <select name="role" value={form.role} onChange={handle}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        {!isEdit && <>
          <label>Contraseña</label>
          <input type="password" name="password" value={form.password} onChange={handle} />
          <label>Confirmar contraseña</label>
          <input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handle} />
        </>}
        <div className="modal-actions">
          <button className="btn" type="submit">{isEdit ? "Guardar" : "Crear"}</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}
