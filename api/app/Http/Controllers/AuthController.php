<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth; // Facade JWT
use Tymon\JWTAuth\Exceptions\JWTException;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Solo los administradores pueden registrar nuevos usuarios'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'role' => 'in:user,admin' // opcional: admin puede definir rol, pero solo 'user' permitido abajo
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Forzar rol 'user' siempre, aunque envíe 'admin' en el body
        $role = 'user';

        $newUser = \App\Models\User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password, // mutator cifra automáticamente
            'role' => $role
        ]);

        return response()->json([
            'message' => 'Usuario creado correctamente',
            'user' => $newUser
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        try {
            if (! $token = JWTAuth::attempt($credentials)) {
                return response()->json(['error' => 'Credenciales inválidas'], 401);
            }
        } catch (JWTException $e) {
            return response()->json(['error' => 'No se pudo crear el token'], 500);
        }

        // obtener usuario autenticado
        $user = Auth::user();

        return response()->json(compact('user','token'));
    }

    public function me()
    {
        // auth()->user() o Auth::user()
        return response()->json(Auth::user());
    }

    public function logout()
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (\Exception $e) {
            // token invalid, etc.
        }

        return response()->json(['message' => 'Sesión cerrada']);
    }
}
