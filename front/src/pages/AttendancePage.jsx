/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useContext } from "react";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "../contexts/AuthContext";

const AttendancePage = () => {
  const { user } = useContext(AuthContext);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [position, setPosition] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Inicializar cámara
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        alert("Debes permitir acceso a la cámara para registrar asistencias.");
      }
    })();

    // Obtener geolocalización
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => alert("Debes permitir la ubicación para continuar."),
        { enableHighAccuracy: true }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  }, []);

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const maxSize = 400; // Tamaño máximo en px
    const ratio = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
    const width = video.videoWidth * ratio;
    const height = video.videoHeight * ratio;

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => setPhoto(blob),
      "image/jpeg",
      0.7
    );
  };

  const handleRegister = async (type) => {
    if (!photo) return alert("Primero toma una foto antes de registrar.");
    if (!position.lat || !position.lng) return alert("No se pudo obtener tu ubicación.");

    setLoading(true);
    setMessage("");

    // Fecha ajustada a zona horaria de Ecuador
    const now = new Date();
    const ecuadorTime = new Date(now.getTime() - (now.getTimezoneOffset() + 300) * 60000);

    const formData = new FormData();
    formData.append("type", type);
    formData.append("photo", photo);
    formData.append("latitude", position.lat);
    formData.append("longitude", position.lng);
    formData.append("timestamp", ecuadorTime.toISOString()); // ⏰ fecha ajustada

    try {
      const res = await axiosClient.post("/attendance", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`✅ ${type === "entry" ? "Entrada" : "Salida"} registrada correctamente.`);
      setPhoto(null);
    } catch (err) {
      console.error(err);
      setMessage("❌ Error al registrar asistencia: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="card">
        <h2>Registro de Asistencia</h2>
        <p>Usuario: <strong>{user?.name}</strong></p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxWidth: 400, borderRadius: 8 }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <button className="btn" style={{ marginTop: 12 }} onClick={capturePhoto}>
            📸 Tomar Foto
          </button>

          {photo && (
            <img
              src={URL.createObjectURL(photo)}
              alt="captura"
              style={{ marginTop: 12, width: 200, borderRadius: 8 }}
            />
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: 20 }}>
            <button className="btn" onClick={() => handleRegister("entry")} disabled={loading}>
              Registrar Entrada
            </button>
            <button className="btn secondary" onClick={() => handleRegister("exit")} disabled={loading}>
              Registrar Salida
            </button>
          </div>

          {message && <div style={{ marginTop: 15 }}>{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;