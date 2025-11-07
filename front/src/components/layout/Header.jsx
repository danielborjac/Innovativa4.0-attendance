import React, { useContext } from "react";
import { FaBars } from "react-icons/fa";
import { AuthContext } from "../../contexts/AuthContext";

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  return (
    <header className="header">
      <button className="icon-btn" onClick={onToggleSidebar}><FaBars/></button>
      <div className="header-right">
        <div className="user-info">
          <span>{user?.name}</span>
          <button className="link-btn" onClick={logout}>Salir</button>
        </div>
      </div>
    </header>
  );
}
