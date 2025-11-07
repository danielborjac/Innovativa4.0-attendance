import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import UsersPage from "../pages/UsersPage";
import AttendancePage from "../pages/AttendancePage";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthContext } from "../contexts/AuthContext";
import AdminLayout from "../layouts/AdminLayout";

const AppRoutes = () => {
  const { loading } = useContext(AuthContext);

  if (loading) return <div className="center">Cargando...</div>;

  return (
    <Routes>
      {/* Página pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Redirección base */}
      <Route path="/" element={<Navigate to="/users" replace />} />

      {/* Área protegida */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="users" element={<UsersPage />} />
        <Route path="attendance" element={<AttendancePage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
