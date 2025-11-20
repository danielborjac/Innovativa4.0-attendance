import React, { useState } from "react";
import Modal from "react-modal";
import axiosClient from "../../api/axiosClient";
import * as XLSX from "xlsx-js-style";
import dayjs from "dayjs";
import 'dayjs/locale/es';
import isoweek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import minMax from 'dayjs/plugin/minMax'; 

dayjs.extend(isoweek);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.extend(minMax); 

// Configurar Modal
Modal.setAppElement("#root");

// Borde grueso y delgado para consistencia
const THICK_BORDER = { style: "medium" };
const THIN_BORDER = { style: "thin" };

// Función auxiliar para aplicar estilos (bordes y fuente) a celdas
const setCellStyle = (ws, cellAddress, style) => {
    const cell = ws[cellAddress] = ws[cellAddress] || {};
    cell.s = { ...cell.s, ...style };
};

// Función auxiliar para formatear minutos a HH:mm
const formatMinutesToHHMM = (totalMinutes) => {
    if (totalMinutes <= 0) return '00:00';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calcula las horas extras (50% y 100%) según las reglas de negocio.
 */
const calculateOvertime = (entryDate, exitDate, weekday) => {
    if (!entryDate || !exitDate || exitDate.isBefore(entryDate)) {
        return { extra50: '00:00', extra100: '00:00' };
    }

    let extra50Minutes = 0;
    let extra100Minutes = 0;
    const maxMinutes = 360; // Máximo 6 horas (6 * 60 minutos) para horas extras regulares

    const calculateOverlapMinutes = (start1, end1, start2, end2) => {
        const overlapStart = dayjs.max(start1, start2);
        const overlapEnd = dayjs.min(end1, end2);

        if (overlapStart.isBefore(overlapEnd)) {
            return overlapEnd.diff(overlapStart, 'minute');
        }
        return 0;
    };

    // Regla especial para Sábados - SIN LÍMITE DE 6 HORAS.
    if (weekday === 'SÁBADO' || weekday === 'SATURDAY') {
        const totalMinutes = exitDate.diff(entryDate, 'minute');
        extra100Minutes = totalMinutes; 
        return { extra50: '00:00', extra100: formatMinutesToHHMM(extra100Minutes) };
    }

    // Regla General (Lunes a Viernes y Domingo)
    let current = entryDate;
    while (current.isBefore(exitDate)) {
        const dayStart = current.startOf('day');
        const nextDayStart = dayStart.add(1, 'day');
        const workStart = current;
        const workEnd = dayjs.min(exitDate, nextDayStart); 

        if (workStart.isBefore(workEnd)) {
            // Zona 50%: 18:00 a 00:00 
            const zone50Start = dayStart.add(18, 'hour');
            const zone50End = nextDayStart; 

            // Zona 100%: 00:00 a 06:00 
            const zone100Start = dayStart;
            const zone100End = dayStart.add(6, 'hour');

            extra50Minutes += calculateOverlapMinutes(workStart, workEnd, zone50Start, zone50End);
            extra100Minutes += calculateOverlapMinutes(workStart, workEnd, zone100Start, zone100End);
        }

        current = nextDayStart;
    }
    
    // Aplicar el máximo de 6 horas (360 minutos) para horas extras regulares
    const finalExtra50Minutes = Math.min(extra50Minutes, maxMinutes);
    const finalExtra100Minutes = Math.min(extra100Minutes, maxMinutes);

    return {
        extra50: formatMinutesToHHMM(finalExtra50Minutes),
        extra100: formatMinutesToHHMM(finalExtra100Minutes)
    };
};


export default function ExportModal({ users = [], onClose }) {
    const [selectedUser, setSelectedUser] = useState("");
    const [month, setMonth] = useState("");
    const [allUsers, setAllUsers] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    const fetchAttendancesFor = async (userId, monthStr) => {
        const params = {};
        if (userId) params.user_id = userId;
        if (monthStr) params.month = monthStr;
        try {
            const res = await axiosClient.get("/admin/attendances", { params });
            return res.data?.data || res.data || [];
        } catch (error) {
            console.error("Error fetching attendances:", error);
            return [];
        }
    };

    const processUserData = async (u) => {
        const raw = await fetchAttendancesFor(u.id, month);
        const ws_data = [];
        
        // Fila 1 a 7 (Encabezados)
        const numCols = 13;

        const titleRow = new Array(numCols).fill(""); 
        // Columna B (índice 1) contiene el texto del título
        titleRow[1] = "REGISTRO ASISTENCIA REPORTE INGRESO Y SALIDA";

        ws_data.push(new Array(numCols).fill("")); // Fila 1 (Índice 0)
        ws_data.push(new Array(numCols).fill("")); // Fila 2 (Índice 1)
        ws_data.push(titleRow); // Fila 3 (Índice 2)
        ws_data.push(new Array(numCols).fill("")); // Fila 4 (Índice 3)
        
        const [year, monthNum] = month.split('-');
        const monthName = dayjs(`${year}-${monthNum}-01`).locale('es').format('MMMM').toUpperCase();
        ws_data.push(["", "MES:", monthName]); // Fila 5 (Índice 4)

        const headerRow1 = new Array(numCols).fill(""); // Fila 6 (Índice 5)
        headerRow1[1] = "SEMAN NRO."; headerRow1[2] = "COLABORADOR"; headerRow1[3] = "DIA"; headerRow1[4] = "FECHA"; 
        headerRow1[5] = "HORA DE INGRESO"; headerRow1[6] = "LUGAR"; headerRow1[7] = "HORA DE SALIDA"; 
        headerRow1[8] = "HORAS TRABAJADAS"; headerRow1[9] = "HORAS CONTRATO";
        headerRow1[10] = "HORAS EXTRAS 50%"; headerRow1[11] = "HORAS EXTRAS AL 100%"; headerRow1[12] = "OBSERVACIONES";
        ws_data.push(headerRow1);

        ws_data.push(new Array(numCols).fill("")); // Fila 7 (Índice 6)
        
        // --- Procesamiento de Datos ---
        const groupMap = {};
        raw.forEach(item => {
            const d = dayjs(item.recorded_at).format('YYYY-MM-DD');
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
        let lastWeekNum = sortedDates.length > 0 ? dayjs(sortedDates[0]).isoWeek() : null;
        let currentMonthDayOne = sortedDates.length > 0 ? dayjs(sortedDates[0]) : null;
        
        const weekRanges = [];
        let currentWeekStartRow = firstRowData;

        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            const g = allDaysMap[date];
            const entry = g.entries.length ? g.entries.sort((a,b)=> a.recorded_at.localeCompare(b.recorded_at))[0] : null;
            const exit = g.exits.length ? g.exits.sort((a,b)=> b.recorded_at.localeCompare(a.recorded_at))[0] : null;

            const entryTime = entry ? dayjs(entry.recorded_at).format("HH:mm") : "";
            const entryDateObj = entry ? dayjs(entry.recorded_at) : null;
            const exitTime = exit ? dayjs(exit.recorded_at).format("HH:mm") : "";
            const exitDateObj = exit ? dayjs(exit.recorded_at) : null;
            const entryCoords = entry ? entry.location_name || `${entry.latitude}, ${entry.longitude}` : "";

            let hoursWorked = "";
            let extra50 = "";
            let extra100 = "";
            
            if (entryDateObj && exitDateObj) {
                const diffMinutes = exitDateObj.diff(entryDateObj, 'minute');
                if (diffMinutes > 0) {
                    hoursWorked = formatMinutesToHHMM(diffMinutes);
                    const weekday = dayjs(date).locale("es").format("dddd").toUpperCase();
                    const overtime = calculateOvertime(entryDateObj, exitDateObj, weekday);
                    extra50 = overtime.extra50;
                    extra100 = overtime.extra100;
                } else {
                    hoursWorked = "00:00";
                }
            }

            const dayDate = dayjs(date);
            const currentWeekNum = dayDate.isoWeek();
            
            let displayWeekNumber = "";
            if (currentMonthDayOne && dayDate.isSame(currentMonthDayOne, 'day')) {
                displayWeekNumber = weekCounter;
            } else if (currentWeekNum !== lastWeekNum) {
                weekCounter++;
                weekRanges.push({ start: currentWeekStartRow, end: currentRow - 1 });
                currentWeekStartRow = currentRow; 
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
                extra50, // K: HORAS EXTRAS 50%
                extra100, // L: HORAS EXTRAS AL 100%
                entry?.observation ?? exit?.observation ?? "", // M: OBSERVACIONES
            ];
            ws_data.push(rowData);
            currentRow++;
            
            if (i === sortedDates.length - 1) {
                weekRanges.push({ start: currentWeekStartRow, end: currentRow - 1 });
            }
        }
        
        const lastRowData = currentRow - 1; // Última fila de datos

        // --- AGREGAR FILAS DE FIRMA ---
        
        // Espaciado 1 (B39)
        ws_data.push(new Array(numCols).fill("")); 

        // Espaciado 2
        ws_data.push(new Array(numCols).fill("")); 

        const authRowIndex = currentRow + 2; // (B39)
        const signatureRow1 = new Array(numCols).fill("");
        signatureRow1[1] = "Autorizado por:"; 
        ws_data.push(signatureRow1);

        // Espaciado entre firmas
        ws_data.push(new Array(numCols).fill("")); 

        const approveRowIndex = currentRow + 4; // (B41)
        const signatureRow2 = new Array(numCols).fill("");
        signatureRow2[1] = "Aprobado por:"; 
        ws_data.push(signatureRow2);
        
        // Espaciado final
        ws_data.push(new Array(numCols).fill("")); 

        return { ws_data, weekRanges, lastRowData, authRowIndex, approveRowIndex, monthName, u };
    }

    const buildAndDownload = async () => {
        if (!month) return alert("Selecciona un mes para exportar.");
        setExportingExcel(true);
        try {
            const wb = XLSX.utils.book_new();
            
            const [year, monthNum] = month.split('-');
            const monthName = dayjs(`${year}-${monthNum}-01`).locale('es').format('MMMM').toUpperCase();

            const targetUsers = allUsers ? users : users.filter(u => String(u.id) === String(selectedUser));

            if (!allUsers && targetUsers.length === 0) {
                alert("Selecciona un usuario o marca 'Todos los usuarios'.");
                setExportingExcel(false);
                return;
            }
            
            const userSelectedName = !allUsers && targetUsers.length === 1 ? `_${targetUsers[0].name.toUpperCase()}` : "";
            const filename = `REPORTE ASISTENCIA ${monthName}${userSelectedName}.xlsx`;

            const numCols = 13;

            for (const u of targetUsers) {
                const { ws_data, weekRanges, lastRowData, authRowIndex, approveRowIndex } = await processUserData(u);

                // Crear hoja de cálculo
                const ws = XLSX.utils.aoa_to_sheet(ws_data);

                // --- 1. CONFIGURACIÓN DE IMPRESIÓN (Page Setup) ---
                ws["!pageSetup"] = {
                    paperSize: 9,           // A4
                    orientation: "landscape", // Horizontal
                    
                    fitToPage: true,        // Clave para activar el ajuste
                    fitToWidth: 1,          // Ajustar columnas a 1 página
                    fitToHeight: 0,         // Altura libre (tantas páginas como sea necesario)
                    
                    // Márgenes estrechos
                    top: 0.2, 
                    bottom: 0.2,
                    left: 0.2,
                    right: 0.2,
                    header: 0.3,
                    footer: 0.3,
                    
                    // Asegurarse de que el scaling esté vacío o se ajuste
                    // No incluir la línea `scale: 100`
                };
                
                // --- 2. Aplicar Combinaciones de Celdas ---
                ws["!merges"] = ws["!merges"] || [];

                // Título 'REGISTRO...' (B3 a M4) 
                ws["!merges"].push({ s: { r: 2, c: 1 }, e: { r: 3, c: numCols - 1 } });
                
                // Encabezados (B6 a M7) 
                for(let c = 1; c < numCols; c++) {
                    ws["!merges"].push({ s: { r: 5, c: c }, e: { r: 6, c: c } });
                }
                
                // Nombre del COLABORADOR (C8 a C[final]) 
                const firstRowData = 7;
                if (lastRowData >= firstRowData) {
                    ws["!merges"].push({ s: { r: firstRowData, c: 2 }, e: { r: lastRowData, c: 2 } });
                }
                
                // SEMAN NRO. combinado verticalmente
                for (const range of weekRanges) {
                    if (range.end > range.start) {
                        ws["!merges"].push({ s: { r: range.start, c: 1 }, e: { r: range.end, c: 1 } });
                    }
                }
                
                // Firmas 
                const textSigMergeStartCol = 1; // Columna B
                const textSigMergeEndCol = 2;   // Columna C
                const lineSigMergeStartCol = 3; // Columna D
                const lineSigMergeEndCol = 5;   // Columna F

                // Autorizado por: Texto (B:C) y Línea (D:F)
                ws["!merges"].push({ s: { r: authRowIndex, c: textSigMergeStartCol }, e: { r: authRowIndex, c: textSigMergeEndCol } });
                ws["!merges"].push({ s: { r: authRowIndex, c: lineSigMergeStartCol }, e: { r: authRowIndex, c: lineSigMergeEndCol } });

                // Aprobado por: Texto (B:C) y Línea (D:F)
                ws["!merges"].push({ s: { r: approveRowIndex, c: textSigMergeStartCol }, e: { r: approveRowIndex, c: textSigMergeEndCol } });
                ws["!merges"].push({ s: { r: approveRowIndex, c: lineSigMergeStartCol }, e: { r: approveRowIndex, c: lineSigMergeEndCol } });


                // --- 3. Aplicar Anchos de Columna ---
                ws["!cols"] = [
                    { wch: 3 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, 
                    { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, 
                ];

                // --- 4. Aplicar Estilos ---
                
                // 1. Título principal (B3-M4)
                const titleStyle = {
                    font: { sz: 11, bold: true, name: "Bodoni MT Black" },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                };
                setCellStyle(ws, 'B3', titleStyle);

                for (let r = 2; r <= 3; r++) { 
                    for (let c = 1; c < numCols; c++) { 
                        const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
                        const border = {
                            top: r === 2 ? THICK_BORDER : THIN_BORDER,
                            bottom: r === 3 ? THICK_BORDER : THIN_BORDER,
                            left: c === 1 ? THICK_BORDER : THIN_BORDER,
                            right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER
                        };
                        setCellStyle(ws, cellAddress, { border: border });
                    }
                }
                
                
                
                // Fila 5: Bloque del Mes (B5:M5)
                const monthBorderStyle = { border: { top: THICK_BORDER, bottom: THICK_BORDER, left: THICK_BORDER, right: THICK_BORDER } };
                const monthFont = { font: { bold: true, sz: 10 } };

                setCellStyle(ws, 'B5', { ...monthBorderStyle, ...monthFont, alignment: { horizontal: "center", vertical: "center" } });
                setCellStyle(ws, 'C5', { ...monthBorderStyle, ...monthFont, alignment: { horizontal: "center", vertical: "center" } });
                
                for(let c = 3; c < numCols; c++) {
                    const cellAddress = XLSX.utils.encode_cell({r: 4, c: c}); 
                    const border = { top: THICK_BORDER, bottom: THICK_BORDER, left: THIN_BORDER, right: THIN_BORDER };
                    if (c === 3) border.left = THICK_BORDER; 
                    if (c === numCols - 1) border.right = THICK_BORDER; 
                    setCellStyle(ws, cellAddress, { border: border });
                }

                // Encabezados (B6:M7) 
                const headerStyle = {
                    font: { bold: true, sz: 10 },
                    alignment: { horizontal: "center", vertical: "center", wrapText: true },
                    fill: { fgColor: { rgb: "FFFFFF" } },
                };
                
                for(let c = 1; c < numCols; c++) {
                    const cellR6 = XLSX.utils.encode_cell({r: 5, c: c});
                    setCellStyle(ws, cellR6, {
                        ...headerStyle,
                        border: {
                            top: THICK_BORDER, bottom: THIN_BORDER,
                            right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER,
                            left: c === 1 ? THICK_BORDER : THIN_BORDER
                        }
                    });
                    const cellR7 = XLSX.utils.encode_cell({r: 6, c: c});
                    setCellStyle(ws, cellR7, {
                        ...headerStyle,
                        border: {
                            top: THIN_BORDER, bottom: THICK_BORDER,
                            right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER,
                            left: c === 1 ? THICK_BORDER : THIN_BORDER
                        }
                    });
                }
                
                // Columna de colaborador combinada (C8:C[final])
                if (lastRowData >= firstRowData) {
                    const collabCellAddress = XLSX.utils.encode_cell({r: firstRowData, c: 2});
                    const collabStyle = {
                        alignment: { horizontal: "center", vertical: "center" },
                        font: { sz: 14, bold: true },
                        border: { top: THICK_BORDER, bottom: THICK_BORDER, left: THICK_BORDER, right: THICK_BORDER }
                    };

                    setCellStyle(ws, collabCellAddress, collabStyle);

                    for (let r = firstRowData + 1; r <= lastRowData; r++) {
                        const cellAddress = XLSX.utils.encode_cell({r: r, c: 2});
                        const border = {
                            top: r === firstRowData ? THICK_BORDER : THIN_BORDER,
                            bottom: r === lastRowData ? THICK_BORDER : THIN_BORDER,
                            left: THICK_BORDER,
                            right: THICK_BORDER
                        };
                        setCellStyle(ws, cellAddress, { border: border });
                    }
                }
                
                // Columna SEMAN NRO. (B8:B[final]) y Bordes de datos
                for (const range of weekRanges) {
                    for (let r = range.start; r <= range.end; r++) {
                        const cellAddress = XLSX.utils.encode_cell({r: r, c: 1}); 
                        const border = {
                            top: r === range.start ? THICK_BORDER : THIN_BORDER,
                            bottom: r === range.end ? THICK_BORDER : THIN_BORDER,
                            left: THICK_BORDER,
                            right: THICK_BORDER
                        };
                        setCellStyle(ws, cellAddress, {
                            alignment: { horizontal: "center", vertical: "center" }, font: { sz: 10 }, border: border
                        });
                        
                        for (let c = 3; c < numCols; c++) {
                            const dataCellAddress = XLSX.utils.encode_cell({r: r, c: c});
                            const dataBorder = {
                                top: r === range.start ? THICK_BORDER : THIN_BORDER,
                                bottom: r === range.end ? THICK_BORDER : THIN_BORDER,
                                left: THIN_BORDER,
                                right: c === numCols - 1 ? THICK_BORDER : THIN_BORDER
                            };
                            setCellStyle(ws, dataCellAddress, {
                                alignment: { horizontal: "center", vertical: "center" }, font: { sz: 10 }, border: dataBorder
                            });
                        }
                    }
                }

                // --- Estilos para Filas de Firma ---
                const signatureStyle = { font: { sz: 10, bold: true } };
                const lineStyle = { border: { bottom: THICK_BORDER } };
                
                // Autorizado por: Texto (B:C)
                const authTextCell = XLSX.utils.encode_cell({r: authRowIndex, c: 1});
                setCellStyle(ws, authTextCell, { ...signatureStyle, alignment: { horizontal: "center", vertical: "center" } });

                // Línea Autorizado por: (D:F)
                for (let c = lineSigMergeStartCol; c <= lineSigMergeEndCol; c++) {
                    const lineCell = XLSX.utils.encode_cell({r: authRowIndex, c: c});
                    setCellStyle(ws, lineCell, lineStyle);
                }

                // Aprobado por: Texto (B:C)
                const approveTextCell = XLSX.utils.encode_cell({r: approveRowIndex, c: 1});
                setCellStyle(ws, approveTextCell, { ...signatureStyle, alignment: { horizontal: "center", vertical: "center" } });

                // Línea Aprobado por: (D:F)
                for (let c = lineSigMergeStartCol; c <= lineSigMergeEndCol; c++) {
                    const lineCell = XLSX.utils.encode_cell({r: approveRowIndex, c: c});
                    setCellStyle(ws, lineCell, lineStyle);
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
            setExportingExcel(false);
        }
    };

    return (
        <Modal isOpen onRequestClose={onClose} className="modal" overlayClassName="overlay">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Exportar asistencias</h3>

            <div className="flex flex-col space-y-4">
                <div style={{display:"flex"}}>
                    <label style={{width:"65%", fontWeight:"bolder"}}>Todos los usuarios</label>
                    <input
                        type="checkbox"
                        checked={allUsers}
                        onChange={e=> setAllUsers(e.target.checked)}
                        style={{width:"25%"}}
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
                    className="btn"
                    onClick={buildAndDownload}
                    disabled={exportingExcel}
                >
                    {exportingExcel ? "Generando Excel..." : "Exportar Excel"}
                </button>
                <button
                    className="btn secondary"
                    onClick={onClose}
                >
                    Cancelar
                </button>
            </div>
        </Modal>
    );
}