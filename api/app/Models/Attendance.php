<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'user_id', 'type', 'photo_path', 'latitude', 'longitude', 'recorded_at'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
