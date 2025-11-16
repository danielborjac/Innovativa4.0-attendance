<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Attendance;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:entry,exit',
            'photo' => 'nullable|image|max:5120',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user = Auth::user();

        // Obtener la hora actual en zona horaria de Ecuador
        $ecuadorNow = Carbon::now('America/Guayaquil');

        // Verificar si el usuario ya registró este tipo (entry/exit) en el día actual
        $alreadyExists = Attendance::where('user_id', $user->id)
            ->where('type', $request->type)
            ->whereDate('recorded_at', $ecuadorNow->toDateString())
            ->exists();

        if ($alreadyExists) {
            $tipo = "";
            if($request->type == "entry"){
                $tipo="entrada";
            }
            else{
                $tipo="salida";
            }
            return response()->json([
                'message' => "Ya registraste tu hora de {$tipo} hoy."
            ], 409);
        }

        // Guardar foto si existe
        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('attendances', 'public');
        }

        // Crear registro
        $attendance = Attendance::create([
            'user_id' => $user->id,
            'type' => $request->type,
            'photo_path' => $photoPath,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'observation' => $request->observation,
            'recorded_at' => $ecuadorNow, // ahora sí con la hora de Ecuador
        ]);

        // Devolver respuesta con URL pública de la foto
        return response()->json([
            'id' => $attendance->id,
            'user_id' => $attendance->user_id,
            'type' => $attendance->type,
            'photo_url' => $attendance->photo_path ? asset('storage/' . $attendance->photo_path) : null,
            'latitude' => $attendance->latitude,
            'longitude' => $attendance->longitude,
            'observation' => $request->observation,
            'recorded_at' => $attendance->recorded_at->format('Y-m-d H:i:s'),
        ], 201);
    }
}
