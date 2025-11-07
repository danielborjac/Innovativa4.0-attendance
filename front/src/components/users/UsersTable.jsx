import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import UserModal from "./UserModal";
import ConfirmDialog from "./ConfirmDialog";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";

export default function UsersTable({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState(null); // null | {} for create | user object for edit
  const [confirm, setConfirm] = useState({ open: false, userId: null });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => setOpenUser({}); // empty object signals create
  const openEdit = (u) => setOpenUser(u);

  const handleSave = async (data, isEdit) => {

      if (isEdit) {
        await axiosClient.put(`/admin/users/${data.id}`, data);
      } else {
        // create via register endpoint (admin only)
        await axiosClient.post("/register", {
          name: data.name,
          email: data.email,
          password: data.password,
          password_confirmation: data.password_confirmation,
          role: data.role,
        });
      }
      setOpenUser(null);
      fetchUsers();

  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/admin/users/${id}`);
      setConfirm({ open: false, userId: null });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Lista de usuarios</h3>
        {isAdmin && <button className="btn" onClick={openCreate}><FaPlus/> Crear usuario</button>}
      </div>

      {loading ? <div>Cargando...</div> : (
        <table className="table">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {users?.length ? users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => openEdit(u)} title="Editar"><FaEdit/></button>
                  <button className="icon-btn danger" onClick={() => setConfirm({ open: true, userId: u.id })} title="Eliminar"><FaTrash/></button>
                </td>
              </tr>
            )) : <tr><td colSpan="4">Sin usuarios</td></tr>}
          </tbody>
        </table>
      )}

      {openUser !== null && (
        <UserModal
          user={openUser}
          onClose={() => setOpenUser(null)}
          onSave={handleSave}
        />
      )}

      {confirm.open && (
        <ConfirmDialog
          message="¿Eliminar este usuario?"
          onCancel={() => setConfirm({ open: false, userId: null })}
          onConfirm={() => handleDelete(confirm.userId)}
        />
      )}
    </div>
  );
}
