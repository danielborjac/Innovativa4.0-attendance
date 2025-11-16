import React, { useState } from "react";
import Modal from "react-modal";
import axiosClient from "../../api/axiosClient";
import * as XLSX from "xlsx-js-style"; 
import dayjs from "dayjs"; 
import 'dayjs/locale/es';
import isoweek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoweek);

// Configurar Modal
Modal.setAppElement("#root");

// Borde grueso
const THICK_BORDER = { style: "medium" };
// Borde delgado
const THIN_BORDER = { style: "thin" };

// Función auxiliar para aplicar estilos (bordes y fuente) a celdas
const setCellStyle = (ws, cellAddress, style) => {
    const cell = ws[cellAddress] = ws[cellAddress] || {};
    cell.s = { ...cell.s, ...style };
};

export default function ExportModal({ users = [], onClose }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [month, setMonth] = useState("");
  const [allUsers, setAllUsers] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAttendancesFor = async (userId, monthStr) => {
    const params = {};
    if (userId) params.user_id = userId;
    if (monthStr) params.month = monthStr;
    const res = await axiosClient.get("/admin/attendances", { params });
    return res.data?.data || res.data || [];
  };

  const buildAndDownload = async () => {
    if (!month) return alert("Selecciona un mes para exportar.");
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      const [year, monthNum] = month.split('-');
      const monthName = dayjs(`${year}-${monthNum}-01`).locale('es').format('MMMM').toUpperCase();

      const targetUsers = allUsers ? users : users.filter(u => String(u.id) === String(selectedUser));

      if (!allUsers && targetUsers.length === 0) {
        alert("Selecciona un usuario o marca 'Todos los usuarios'.");
        setExporting(false);
        return;
      }
      
      const userSelectedName = !allUsers && targetUsers.length === 1 ? `_${targetUsers[0].name.toUpperCase()}` : "";
      const filename = `REPORTE ASISTENCIA ${monthName}${userSelectedName}.xlsx`;

      // Columnas de datos (B a M)
      const dataColumns = [
          "SEMAN NRO.", "COLABORADOR", "DIA", "FECHA", "HORA DE INGRESO",
          "LUGAR", "HORA DE SALIDA", "HORAS TRABAJADAS", "HORAS CONTRATO",
          "HORAS EXTRAS 50%", "HORAS EXTRAS AL 100%", "OBSERVACIONES"
      ];
      const numCols = dataColumns.length + 1; // 13 columnas (A-M)

      for (const u of targetUsers) {
        const raw = await fetchAttendancesFor(u.id, month);

        const ws_data = [];
        
        // Fila 1 (A1:M1) - Vacia. (Índice 0)
        ws_data.push(new Array(numCols).fill("")); 
        
        // Fila 2 (A2:M2) - Vacia (Índice 1)
        ws_data.push(new Array(numCols).fill(""));

        // Fila 3 (A3:M3) - Título (va en B3) (Índice 2)
        ws_data.push(["", "REGISTRO ASISTENCIA REPORTE INGRESO Y SALIDA"]);

        // Fila 4 (A4:M4) - Vacia para combinar el título (Índice 3)
        ws_data.push(new Array(numCols).fill("")); 

        // Fila 5 (A5:M5) - MES: (en B5) y Nombre del Mes (en C5). (Índice 4)
        ws_data.push(["", "MES:", monthName]); 

        // Fila 6 (A6:M6) - Encabezado 1 (Primer nivel de la combinación) (Índice 5)
        const headerRow1 = new Array(numCols).fill(""); 
        headerRow1[1] = "SEMAN NRO.";
        headerRow1[2] = "COLABORADOR";
        headerRow1[3] = "DIA";
        headerRow1[4] = "FECHA";
        headerRow1[5] = "HORA DE INGRESO";
        headerRow1[6] = "LUGAR";
        headerRow1[7] = "HORA DE SALIDA";
        headerRow1[8] = "HORAS TRABAJADAS";
        headerRow1[9] = "HORAS CONTRATO";
        headerRow1[10] = "HORAS EXTRAS 50%";
        headerRow1[11] = "HORAS EXTRAS AL 100%";
        headerRow1[12] = "OBSERVACIONES";
        ws_data.push(headerRow1);

        // Fila 7 (A7:M7) - Encabezado 2 (Segundo nivel de la combinación) (Índice 6)
        const headerRow2 = new Array(numCols).fill("");
        ws_data.push(headerRow2);
        
        // --- Procesamiento de Datos ---
        const groupMap = {};
        raw.forEach(item => {
          const d = item.recorded_at.split(" ")[0]; 
          if (!groupMap[d]) groupMap[d] = { entries: [], exits: [] };
          if (item.type === "entry" || item.type === "entrada") groupMap[d].entries.push(item);
          else groupMap[d].exits.push(item);
        });

        const firstDayOfMonth = dayjs(month + '-01');
        const totalDaysInMonth = firstDayOfMonth.daysInMonth();
        
        const allDaysMap = {};
        for(let i = 1; i <= totalDaysInMonth; i++) {
            const dateStr = firstDayOfMonth.date(i).format('YYYY-MM-DD');
            allDaysMap[dateStr] = groupMap[dateStr] || { entries: [], exits: [] };
        }
        
        const sortedDates = Object.keys(allDaysMap).sort();
        
        let currentRow = ws_data.length; // Fila donde inician los datos (Fila 8, índice 7)
        const firstRowData = currentRow;

        let weekCounter = 1;
        let lastWeekNum = dayjs(sortedDates[0]).isoWeek(); 
        let currentMonthDayOne = dayjs(sortedDates[0]); 
        
        const weekRanges = [];
        let currentWeekStartRow = firstRowData;


        for (let i = 0; i < sortedDates.length; i++) {
          const date = sortedDates[i];
          const g = allDaysMap[date];
          const entry = g.entries.length ? g.entries.sort((a,b)=> a.recorded_at.localeCompare(b.recorded_at))[0] : null;
          const exit = g.exits.length ? g.exits.sort((a,b)=> b.recorded_at.localeCompare(a.recorded_at))[0] : null;

          const entryTime = entry ? entry.recorded_at.split(" ")[1].substring(0, 5) : ""; 
          const entryCoords = entry ? entry.location_name || `${entry.latitude}, ${entry.longitude}` : "";
          const exitTime = exit ? exit.recorded_at.split(" ")[1].substring(0, 5) : ""; 
          
          let hoursWorked = "";
          if (entry && exit) {
              const entryDate = dayjs(entry.recorded_at);
              const exitDate = dayjs(exit.recorded_at);
              const diffMinutes = exitDate.diff(entryDate, 'minute');
              
              if (diffMinutes > 0) {
                  const hours = Math.floor(diffMinutes / 60);
                  const minutes = diffMinutes % 60;
                  hoursWorked = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              } else {
                  hoursWorked = "00:00";
              }
          }

          const dayDate = dayjs(date);
          const currentWeekNum = dayDate.isoWeek();
          
          let displayWeekNumber = "";
          if (dayDate.isSame(currentMonthDayOne, 'day')) {
              displayWeekNumber = weekCounter;
          } else if (currentWeekNum !== lastWeekNum) {
              weekCounter++;
              // Fin de la semana anterior: 
              weekRanges.push({ start: currentWeekStartRow, end: currentRow - 1 });
              currentWeekStartRow = currentRow; // Inicio de la nueva semana
              displayWeekNumber = weekCounter;
          }
          lastWeekNum = currentWeekNum;

          const displayCollaborator = dayDate.date() === 1 ? u.name.toUpperCase() : "";
          const weekday = dayDate.locale("es").format("dddd").toUpperCase();

          const rowData = [
            "", // Columna A - Vacía
            displayWeekNumber, // B: SEMAN NRO. 
            displayCollaborator, // C: COLABORADOR 
            weekday, // D: DIA
            dayDate.format("YYYY-MM-DD"), // E: FECHA
            entryTime, // F: HORA DE INGRESO
            entryCoords, // G: LUGAR (Lugar de ingreso)
            exitTime, // H: HORA DE SALIDA
            hoursWorked, // I: HORAS TRABAJADAS
            u.contracted_hours ?? "", // J: HORAS CONTRATO
            "", // K: HORAS EXTRAS 50%
            "", // L: HORAS EXTRAS AL 100%
            entry?.observation ?? exit?.observation ?? "", // M: OBSERVACIONES
          ];
          ws_data.push(rowData);
          currentRow++;
          
          if (i === sortedDates.length - 1) {
             weekRanges.push({ start: currentWeekStartRow, end: currentRow - 1 });
          }
        }
        
        const lastRowData = currentRow - 1; 

        // Crear hoja de cálculo
        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // --- Aplicar Combinaciones de Celdas ---
        ws["!merges"] = ws["!merges"] || [];

        // Título 'REGISTRO...' (B3 a M4) - Combinado en dos filas (r: 2 a r: 3)
        ws["!merges"].push({ s: { r: 2, c: 1 }, e: { r: 3, c: numCols - 1 } });
        
        // Encabezados (B6 a M7) - Combinados en dos filas (r: 5 a r: 6)
        for(let c = 1; c < numCols; c++) {
            ws["!merges"].push({ s: { r: 5, c: c }, e: { r: 6, c: c } });
        }
        
        // Nombre del COLABORADOR (C8 a C[final]) - r: 7, c: 2 a r: lastRowData, c: 2
        if (lastRowData >= firstRowData) {
            ws["!merges"].push({ s: { r: firstRowData, c: 2 }, e: { r: lastRowData, c: 2 } });
        }
        
        // SEMAN NRO. combinado verticalmente
        for (const range of weekRanges) {
            if (range.end > range.start) {
                // Columna B: SEMAN NRO.
                ws["!merges"].push({ s: { r: range.start, c: 1 }, e: { r: range.end, c: 1 } });
            }
        }
        
        // --- Aplicar Anchos de Columna (A a M) ---
        ws["!cols"] = [
          { wch: 3 }, // A (Vacía)
          { wch: 10 }, // B: SEMAN NRO.
          { wch: 25 }, // C: COLABORADOR (Más ancho por ser combinado)
          { wch: 15 }, // D: DIA
          { wch: 12 }, // E: FECHA
          { wch: 15 }, // F: HORA DE INGRESO
          { wch: 25 }, // G: LUGAR
          { wch: 15 }, // H: HORA DE SALIDA
          { wch: 15 }, // I: HORAS TRABAJADAS
          { wch: 15 }, // J: HORAS CONTRATO
          { wch: 15 }, // K: HORAS EXTRAS 50%
          { wch: 15 }, // L: HORAS EXTRAS AL 100%
          { wch: 35 }, // M: OBSERVACIONES
        ];

        // --- Aplicar Estilos ---
        
        // 1. Título principal (B3-M4) - Borde grueso exterior, Fuente 11
        const titleStyle = { 
            font: { sz: 11, bold: true, name: "Bodoni MT Black" },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
        };
        setCellStyle(ws, 'B3', titleStyle);
        
        // **CORRECCIÓN DE BORDES DEL TÍTULO (B3:M4)**
        for (let r = 2; r <= 3; r++) { // Filas 3 y 4 (índices 2 y 3)
            for (let c = 1; c < numCols; c++) { // Columnas B a M
                const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
                const border = {
                    // Top (solo en fila 3)
                    top: r === 2 ? THICK_BORDER : { style: "thin" }, 
                    // Bottom (solo en fila 4)
                    bottom: r === 3 ? THICK_BORDER : { style: "thin" }, 
                    // Left (solo en columna B)
                    left: c === 1 ? THICK_BORDER : { style: "thin" }, 
                    // Right (solo en columna M)
                    right: c === numCols - 1 ? THICK_BORDER : { style: "thin" }
                };

                // Si la celda es B3, le agregamos el font/alignment
                if (r === 2 && c === 1) {
                    setCellStyle(ws, cellAddress, { ...titleStyle, border: border });
                } else {
                    setCellStyle(ws, cellAddress, { border: border });
                }
            }
        }
        
        // Fila 5: Bloque del Mes (B5:M5)
        const monthBorderStyle = { border: { top: THICK_BORDER, bottom: THICK_BORDER, left: THICK_BORDER, right: THICK_BORDER } };
        const monthFont = { font: { bold: true, sz: 10 } };

        // B5: MES:
        setCellStyle(ws, 'B5', { ...monthBorderStyle, ...monthFont });
        // C5: NOVIEMBRE
        setCellStyle(ws, 'C5', { ...monthBorderStyle, ...monthFont });
        
        // D5 a M5 (Bordes Gruesos y en Blanco)
        for(let c = 3; c < numCols; c++) { // Columna D (índice 3) a M (índice 12)
            const cellAddress = XLSX.utils.encode_cell({r: 4, c: c}); // Fila 5 (índice 4)
            // Solo los bordes gruesos externos
            const border = {
                top: THICK_BORDER,
                bottom: THICK_BORDER,
                left: c === 3 ? THICK_BORDER : THIN_BORDER, // Borde izquierdo de D5 grueso, los demás delgados
                right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER // Borde derecho de M5 grueso
            };
            // Aseguramos que los bordes interiores de D5:M5 sean delgados
            if (c > 3 && c < numCols - 1) {
                 border.left = THIN_BORDER; 
                 border.right = THIN_BORDER;
            }
            // Aseguramos el borde derecho grueso en M5
            if (c === numCols - 1) {
                border.right = THICK_BORDER;
            }
            // Aseguramos el borde izquierdo grueso en D5
             if (c === 3) {
                border.left = THICK_BORDER;
            }

            setCellStyle(ws, cellAddress, { border: border });
        }


        // Encabezados (B6:M7) - Borde grueso exterior
        const headerStyle = {
            font: { bold: true, sz: 10 },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            fill: { fgColor: { rgb: "FFFFFF" } }, 
        };
        
        // Aplicar el estilo y el borde grueso exterior a la región B6:M7
        for(let c = 1; c < numCols; c++) {
            // Fila superior (R6 / índice 5)
            const cellR6 = XLSX.utils.encode_cell({r: 5, c: c});
            setCellStyle(ws, cellR6, { 
                ...headerStyle, 
                border: { 
                    top: THICK_BORDER,
                    bottom: THIN_BORDER, 
                    right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER, 
                    left: c === 1 ? THICK_BORDER : THIN_BORDER 
                } 
            });
            // Fila inferior (R7 / índice 6)
            const cellR7 = XLSX.utils.encode_cell({r: 6, c: c});
            setCellStyle(ws, cellR7, { 
                ...headerStyle, 
                border: { 
                    top: THIN_BORDER, 
                    bottom: THICK_BORDER, 
                    right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER, 
                    left: c === 1 ? THICK_BORDER : THIN_BORDER 
                } 
            });
        }
        
        // Columna de colaborador combinada (C8:C[final]) - Fuente 14, Negrita, Mayúscula, Borde grueso exterior
        if (lastRowData >= firstRowData) {
            const collabCellAddress = XLSX.utils.encode_cell({r: firstRowData, c: 2});
            setCellStyle(ws, collabCellAddress, { 
                alignment: { horizontal: "center", vertical: "center" },
                font: { sz: 14, bold: true }, 
                border: { top: THICK_BORDER, bottom: THICK_BORDER, left: THICK_BORDER, right: THICK_BORDER }
            });
            // Aplicar borde grueso exterior a toda la región combinada
             for (let r = firstRowData + 1; r <= lastRowData; r++) {
                const cellAddress = XLSX.utils.encode_cell({r: r, c: 2});
                setCellStyle(ws, cellAddress, {
                    border: { top: THICK_BORDER, bottom: THICK_BORDER, left: THICK_BORDER, right: THICK_BORDER }
                });
            }
        }
        
        // Columna SEMAN NRO. (B8:B[final]) y Bordes de datos
        for (const range of weekRanges) {
            // Aplicar borde grueso al rango de semana B:B
            for (let r = range.start; r <= range.end; r++) {
                const cellAddress = XLSX.utils.encode_cell({r: r, c: 1}); // Columna B
                const border = {
                    top: r === range.start ? THICK_BORDER : THIN_BORDER,
                    bottom: r === range.end ? THICK_BORDER : THIN_BORDER,
                    left: THICK_BORDER,
                    right: THICK_BORDER
                };
                setCellStyle(ws, cellAddress, {
                    alignment: { horizontal: "center", vertical: "center" },
                    font: { sz: 10 },
                    border: border
                });
                
                // Aplicar bordes al resto de las celdas de datos de la semana (D a M)
                for (let c = 3; c < numCols; c++) { 
                    const dataCellAddress = XLSX.utils.encode_cell({r: r, c: c});
                    const dataBorder = {
                        top: r === range.start ? THICK_BORDER : THIN_BORDER,
                        bottom: r === range.end ? THICK_BORDER : THIN_BORDER,
                        left: THIN_BORDER,
                        right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER
                    };
                    setCellStyle(ws, dataCellAddress, {
                        alignment: { horizontal: "center", vertical: "center" },
                        font: { sz: 10 },
                        border: dataBorder
                    });
                }
            }
        }
        
        // Rellenar bordes interiores delgados que faltan (Columna D a M-1)
        for(let r = firstRowData; r <= lastRowData; r++) {
            for(let c = 3; c < numCols - 1; c++) { 
                 const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
                 const currentBorder = ws[cellAddress]?.s?.border || {};
                 const newBorder = { ...currentBorder };
                 if (!newBorder.right) newBorder.right = THIN_BORDER;
                 if (!newBorder.left) newBorder.left = THIN_BORDER;
                 if (!newBorder.top) newBorder.top = THIN_BORDER;
                 if (!newBorder.bottom) newBorder.bottom = THIN_BORDER;
                 setCellStyle(ws, cellAddress, { border: newBorder });
            }
        }


        const sheetName = u.name.length > 30 ? u.name.slice(0, 25) : u.name;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      XLSX.writeFile(wb, filename);
      onClose && onClose();
    } catch (err) {
      console.error(err);
      alert("Error generando Excel.");
    } finally {
      setExporting(false);
    }
  };

  // El componente de la interfaz de usuario se mantiene igual
  return (
    <Modal isOpen onRequestClose={onClose} className="modal" overlayClassName="overlay">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Exportar asistencias a Excel</h3>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
            <label className="font-medium text-gray-700 w-32">Todos los usuarios</label>
            <input 
                type="checkbox" 
                checked={allUsers} 
                onChange={e=> setAllUsers(e.target.checked)} 
                className="form-checkbox h-5 w-5 text-indigo-600 rounded"
            />
        </div>

        <div className="flex items-center space-x-2">
            <label className="font-medium text-gray-700 w-32">Usuario</label>
            <select 
                value={selectedUser} 
                onChange={e=> setSelectedUser(e.target.value)} 
                disabled={allUsers}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-gray-100"
            >
                <option value="">-- Selecciona --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
        </div>

        <div className="flex items-center space-x-2">
            <label className="font-medium text-gray-700 w-32">Mes</label>
            <input 
                type="month" 
                value={month} 
                onChange={e=> setMonth(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
      </div>

      <div className="flex justify-end mt-6 space-x-3">
        <button 
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400" 
          onClick={buildAndDownload} 
          disabled={exporting}
        >
          {exporting ? "Generando..." : "Exportar"}
        </button>
        <button 
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" 
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}