import React from "react";
import { Link } from "react-router-dom";
import { FaUsers } from "react-icons/fa";

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <h2>Innovativa 4.0</h2>
        <button className="close" onClick={onClose}>✕</button>
      </div>
      <nav>
        <ul>
          <li><Link to="/users"><FaUsers/>👥 Usuarios</Link></li>
          <li><Link to="/attendance">🕒 Asistencias</Link></li>
          {/* otras rutas */}
        </ul>
      </nav>
    </aside>
  );
}
