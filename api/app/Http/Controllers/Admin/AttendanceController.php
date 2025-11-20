<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('user');

        // Filtrar por usuario
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filtrar por rango de fechas (YYYY-MM-DD)
        if ($request->has(['start_date', 'end_date'])) {
            $query->whereBetween('recorded_at', [
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59'
            ]);
        }

        // Filtrar por mes (YYYY-MM)
        if ($request->has('month')) {
            $query->whereMonth('recorded_at', '=', date('m', strtotime($request->month)))
                  ->whereYear('recorded_at', '=', date('Y', strtotime($request->month)));
        }

        // Ordenar y agrupar
        $attendances = $query
            ->orderBy('user_id', 'asc')
            ->orderBy('recorded_at', 'asc')
            ->paginate(50);

        return response()->json($attendances);
    }
    
    /**
     * Actualiza un registro de asistencia existente (PUT).
     */
    public function updateAttendance(Request $request, $id)
    {
        $request->validate([
            'observation' => 'nullable|string|max:500',
            // Aseguramos que el formato de fecha y hora sea el correcto
            'recorded_at' => 'nullable|date_format:Y-m-d H:i:s', 
        ]);

        $attendance = Attendance::find($id);

        if (!$attendance) {
            return response()->json(['message' => 'Asistencia no encontrada'], 404);
        }

        // Actualizar observación
        if ($request->has('observation')) {
            $attendance->observation = $request->observation;
        }

        // Actualizar fecha/hora registrada
        if ($request->has('recorded_at')) {
            $attendance->recorded_at = $request->recorded_at;
        }

        $attendance->save();

        return response()->json([
            'message' => 'Asistencia actualizada correctamente',
            'attendance' => $attendance,
        ]);
    }

    /**
     * Crea un nuevo registro de asistencia (POST - usado para crear la salida faltante).
     */
    public function createAttendance(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'type' => 'required|in:entry,exit',
            'recorded_at' => 'required|date_format:Y-m-d H:i:s',
            'observation' => 'nullable|string|max:500',
            // Campos copiados de la entrada (latitud, longitud, foto_path)
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'photo_path' => 'nullable|string',
        ]);

        $attendance = Attendance::create($request->only([
            'user_id', 
            'type', 
            'recorded_at', 
            'observation',
            'latitude',
            'longitude',
            'photo_path'
        ]));

        return response()->json([
            'message' => 'Asistencia creada correctamente',
            'attendance' => $attendance,
        ], 201);
    }

    public function destroyAttendances(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
        ]);

        $startDate = $request->start_date . ' 00:00:00';
        $endDate = $request->end_date . ' 23:59:59';
        
        // 1. Obtener todos los registros en el rango que tienen una foto.
        $attendancesToDelete = Attendance::whereBetween('recorded_at', [$startDate, $endDate])
            ->whereNotNull('photo_path')
            ->select('photo_path')
            ->get();

        $deletedFilesCount = 0;
        
        // 2. Eliminar las fotos del disco.
        foreach ($attendancesToDelete as $attendance) {
            // Verificamos que el archivo exista antes de intentar borrarlo.
            if (Storage::disk('public')->exists($attendance->photo_path)) {
                Storage::disk('public')->delete($attendance->photo_path);
                $deletedFilesCount++;
            }
        }
        
        // 3. Eliminar los registros de la base de datos (incluyendo aquellos sin foto).
        $deletedRecordsCount = Attendance::whereBetween('recorded_at', [$startDate, $endDate])->delete();

        return response()->json([
            'message' => 'Registros y fotos eliminados correctamente.',
            'deleted_records' => $deletedRecordsCount,
            'deleted_files' => $deletedFilesCount,
        ]);
    }
}