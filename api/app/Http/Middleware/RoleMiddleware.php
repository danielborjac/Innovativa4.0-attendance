<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Uso en rutas: ->middleware('role:admin')
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string $role
     */
    public function handle($request, Closure $next, $role)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        if ($user->role !== $role) {
            return response()->json(['error' => 'Acceso denegado (rol insuficiente)'], 403);
        }

        return $next($request);
    }
}
