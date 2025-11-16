<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::post('login', [AuthController::class, 'login']);

// Rutas protegidas con JWT
Route::group(['middleware' => ['jwt.auth']], function() {
    Route::post('register', [AuthController::class, 'register']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);

    Route::post('attendance', [AttendanceController::class, 'store']);

    // Rutas admin
    Route::group(['prefix' => 'admin', 'middleware' => ['role:admin']], function() {
        Route::get('users', [AdminUserController::class, 'index']);
        Route::put('users/{id}', [AdminUserController::class, 'update']);
        Route::delete('users/{id}', [AdminUserController::class, 'destroy']);
        Route::get('attendances', [AdminAttendanceController::class, 'index']);
        Route::put('attendances/{id}', [AdminAttendanceController::class, 'updateObservation']);
        
    });
});