<?php

namespace App\Http\Controllers;

use App\Models\PropertyDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    /**
     * Download a document
     */
    public function download(PropertyDocument $document): StreamedResponse
    {
        // Check if document is public or user is authenticated
        if (!$document->is_public && !auth()->check()) {
            abort(403, 'You must be logged in to download this document.');
        }

        // Check if file exists
        if (!Storage::disk('public')->exists($document->file_path)) {
            abort(404, 'Document not found.');
        }

        // Increment download count
        $document->incrementDownloads();

        // Get file name for download
        $fileName = $document->title ?? $document->name;
        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
        if (!str_ends_with($fileName, '.' . $extension)) {
            $fileName .= '.' . $extension;
        }

        return Storage::disk('public')->download($document->file_path, $fileName);
    }

    /**
     * View document (for PDFs and images)
     */
    public function view(PropertyDocument $document)
    {
        // Check if document is public or user is authenticated
        if (!$document->is_public && !auth()->check()) {
            abort(403, 'You must be logged in to view this document.');
        }

        // Check if file exists
        if (!Storage::disk('public')->exists($document->file_path)) {
            abort(404, 'Document not found.');
        }

        $mimeType = Storage::disk('public')->mimeType($document->file_path);

        return response()->file(
            Storage::disk('public')->path($document->file_path),
            ['Content-Type' => $mimeType]
        );
    }
}
