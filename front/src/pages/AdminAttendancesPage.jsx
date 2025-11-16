/* eslint-disable no-unused-vars */
// src/pages/AdminAttendancesPage.jsx
import React, { useEffect, useState, useContext } from "react";
import AdminLayout from "../layouts/AdminLayout";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "../contexts/AuthContext";
import AttendanceAdminTable from "../components/attendance/AttendanceAdminTable";
import ExportModal from "../components/attendance/ExportModal";
import { parseEcuadorToMs } from "../utils/dateUtils";
import { useNavigate } from "react-router-dom";

export default function AdminAttendancesPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // redirect non-admin to /attendance
  useEffect(() => {
    if (user && user.role !== "admin") navigate("/attendance");
  }, [user]);

  const [filters, setFilters] = useState({
    user_id: "", // empty = all
    start_date: "",
    end_date: "",
    month: "",
    page: 1,
  });
  const [users, setUsers] = useState([]);
  const [attendancesRaw, setAttendancesRaw] = useState([]); // raw data from API
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    // fetch users for dropdown
    const fetchUsers = async () => {
      try {
        const res = await axiosClient.get("/admin/users");
        // if API returns pagination/data wrapper adjust accordingly
        setUsers(res.data?.data || res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  const fetchAttendances = async (params = {}) => {
    setLoading(true);
    try {
      const q = { ...filters, ...params };
      // Build query params: only include non-empty
      const paramsObj = {};
      if (q.user_id) paramsObj.user_id = q.user_id;
      if (q.start_date) paramsObj.start_date = q.start_date;
      if (q.end_date) paramsObj.end_date = q.end_date;
      if (q.month) paramsObj.month = q.month;
      paramsObj.page = q.page || 1;

      const res = await axiosClient.get("/admin/attendances", { params: paramsObj });
      const payload = res.data?.data || res.data?.data || res.data;
      // API returns pagination wrapper; normalize to array:
      const items = res.data?.data || res.data?.data || res.data?.data || res.data;
      // If the API returns paginated object with 'data' property:
      const raw = res.data && res.data.data ? res.data.data : res.data;
      setAttendancesRaw(raw || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial fetch
    //fetchAttendances();
  }, []);

  return (

      <div className="card">
        <div className="card-header" style={{ alignItems: "center" }}>
          <h2>Reporte de Asistencias (admin)</h2>
          <div>
            <button className="btn" onClick={() => setExportOpen(true)}>
              Exportar Excel
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={filters.user_id} onChange={(e)=> setFilters(f => ({...f, user_id: e.target.value}))}>
            <option value="">Todos los usuarios</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div class="admin-attendance">
            <label>Desde: <input type="date" value={filters.start_date} onChange={e=> setFilters(f => ({...f, start_date: e.target.value}))} /></label>
            
            <label>Hasta: <input type="date" value={filters.end_date} onChange={e=> setFilters(f => ({...f, end_date: e.target.value}))} /></label>
            
            <label>Mes: <input type="month" value={filters.month} onChange={e=> setFilters(f => ({...f, month: e.target.value}))} /></label>
            
          </div>
          <button className="btn" onClick={() => fetchAttendances({ page: 1 })}>Aplicar</button>
        </div>

        <AttendanceAdminTable
          loading={loading}
          raw={attendancesRaw}
          onReload={() => fetchAttendances()}
        />
        {exportOpen && (
        <ExportModal
          users={users}
          onClose={() => setExportOpen(false)}
        />
      )}

      </div>
  );
}
