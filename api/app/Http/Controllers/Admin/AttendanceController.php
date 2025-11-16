<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

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
    public function updateObservation(Request $request, $id)
    {
        $request->validate([
            'observation' => 'nullable|string|max:500',
        ]);

        $attendance = Attendance::find($id);

        if (!$attendance) {
            return response()->json(['message' => 'Asistencia no encontrada'], 404);
        }

        $attendance->observation = $request->observation;
        $attendance->save();

        return response()->json([
            'message' => 'Observación actualizada correctamente',
            'attendance' => $attendance,
        ]);
    }
}
