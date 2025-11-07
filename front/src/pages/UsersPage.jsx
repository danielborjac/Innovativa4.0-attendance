import React, { useContext} from "react";
import UsersTable from "../components/users/UsersTable";
import { AuthContext } from "../contexts/AuthContext";

export default function UsersPage() {
  const { user } = useContext(AuthContext);

  return (
    <div className="app-layout">
      <div className="main">
        <main className="content">
          <h1>Usuarios</h1>
          <UsersTable isAdmin={user?.role === "admin"} />
        </main>
      </div>
    </div>
  );
}
