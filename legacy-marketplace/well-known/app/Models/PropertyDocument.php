<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'name',
        'title',
        'description',
        'type',
        'file_path',
        'file_size',
        'is_public',
        'category',
        'download_count',
        'uploaded_by',
    ];

    protected $appends = ['download_url', 'formatted_size', 'icon'];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'file_size' => 'integer',
            'download_count' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getDownloadUrlAttribute(): string
    {
        return "/documents/{$this->id}/download";
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->file_size ?? 0;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }

        return $bytes . ' bytes';
    }

    public function getIconAttribute(): string
    {
        $type = strtolower($this->type ?? 'other');

        return match($type) {
            'pdf' => 'document-text',
            'doc', 'docx' => 'document',
            'xls', 'xlsx' => 'table-cells',
            'ppt', 'pptx' => 'presentation-chart-bar',
            'jpg', 'jpeg', 'png', 'gif' => 'photo',
            'zip', 'rar' => 'archive-box',
            default => 'document',
        };
    }

    public function incrementDownloads(): void
    {
        $this->increment('download_count');
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
