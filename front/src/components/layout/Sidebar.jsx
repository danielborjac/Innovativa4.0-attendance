import React from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useContext } from "react";

export default function Sidebar({ open, onClose }) {
  const { user } = useContext(AuthContext);
  let role = "user";
  if(user){
    role = user.role
  }

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <h2>Innovativa 4.0</h2>
        <button className="close" onClick={onClose}>✕</button>
      </div>
      <nav>     
        {role == "admin" && (
          <>
            <NavLink to="/users">Usuarios</NavLink>
            <NavLink to="/admin_attendance">Control Asistencias</NavLink>
          </>
        )}
        <NavLink to="/attendance">Asistencias</NavLink>
        {/* otras rutas */}
      </nav>
    </aside>
  );
}
