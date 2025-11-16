import React, { useContext, useEffect} from "react";
import UsersTable from "../components/users/UsersTable";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function UsersPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
    // redirect non-admin to /attendance
    useEffect(() => {
      if (user && user.role !== "admin") navigate("/attendance");
    }, [user]);

  return (
    <main className="content">
      <h1>Usuarios</h1>
      <UsersTable isAdmin={user?.role === "admin"} />
    </main>
  );
}
