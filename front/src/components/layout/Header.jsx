import { useContext, useState, useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa";
import { AuthContext } from "../../contexts/AuthContext";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="header">
      <button className="icon-btn" onClick={onToggleSidebar}><FaBars/></button>
      <h1 className="header-title">Panel de control asistencias</h1>

      <div className="user-menu" ref={menuRef}>
        <button
          className="user-button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <FaUserCircle className="user-icon" />
          <span className="user-name">{user?.email || "Administrador"}</span>
        </button>

        {menuOpen && (
          <div className="dropdown-admin">
            <button className="logout-button" onClick={logout}>
              <FaSignOutAlt /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
