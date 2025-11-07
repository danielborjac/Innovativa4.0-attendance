import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/users");
    } catch (error) {
      setErr(error.response?.data?.message || error.message || "Error de login");
    }
  };

  return (
    <div className="page-center">
      <form className="card" onSubmit={submit}>
        <h2>Iniciar sesión</h2>
        {err && <div className="alert">{err}</div>}
        <label>Correo</label>
        <input value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="btn">Entrar</button>
      </form>
    </div>
  );
}
