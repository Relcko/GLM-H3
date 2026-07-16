<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\PropertyDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $query = Property::query();

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                ->orWhere('location', 'like', "%{$request->search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('property_type', $request->type);
        }

        $properties = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        return Inertia::render('Admin/Properties/Index', [
            'properties' => $properties,
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Properties/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'location' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'city' => ['required', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'property_type' => ['required', 'in:residential,commercial,industrial,land'],
            'total_value' => ['required', 'numeric', 'min:0'],
            'token_price' => ['required', 'numeric', 'min:0'],
            'total_tokens' => ['required', 'integer', 'min:1'],
            'expected_roi' => ['required', 'numeric', 'min:0', 'max:100'],
            'rental_yield' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'appreciation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'dividend_frequency' => ['nullable', 'integer', 'in:1,2,4,12'],
            'min_investment' => ['required', 'numeric', 'min:0'],
            'amenities' => ['nullable', 'array'],
            'features' => ['nullable', 'array'],
            'status' => ['required', 'in:draft,upcoming,active,sold_out,closed'],
            'blockchain' => ['required', 'in:ethereum,bsc,sepolia,bsc_testnet'],
            'contract_address' => ['nullable', 'string'],
            'token_id' => ['nullable', 'integer'],
            'property_size' => ['nullable', 'integer'],
            'property_size_unit' => ['nullable', 'string'],
            'bedrooms' => ['nullable', 'integer'],
            'bathrooms' => ['nullable', 'integer'],
            'year_built' => ['nullable', 'integer'],
            'funding_deadline' => ['nullable', 'date'],
            'is_featured' => ['boolean'],
            'images' => ['nullable', 'array'],
            'images.*' => ['image', 'max:5120'],
        ]);

        // Handle image uploads
        $images = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('properties', 'public');
                $images[] = Storage::url($path);
            }
        }

        $validated['images'] = $images;
        $validated['slug'] = Str::slug($validated['name']);
        $validated['available_tokens'] = $validated['total_tokens'];

        $property = Property::create($validated);

        return redirect()->route('admin.properties.show', $property)
            ->with('success', 'Property created successfully.');
    }

    public function show(Property $property)
    {
        $property->load(['documents', 'investments.user', 'tokenHoldings.user']);

        $stats = [
            'total_investors' => $property->tokenHoldings()->distinct('user_id')->count(),
            'total_invested' => $property->investments()->where('status', 'confirmed')->sum('amount_paid'),
            'pending_investments' => $property->investments()->where('status', 'pending')->count(),
        ];

        return Inertia::render('Admin/Properties/Show', [
            'property' => $property,
            'stats' => $stats,
        ]);
    }

    public function edit(Property $property)
    {
        return Inertia::render('Admin/Properties/Edit', [
            'property' => $property->load('documents'),
        ]);
    }

    public function update(Request $request, Property $property)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'location' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'city' => ['required', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'property_type' => ['required', 'in:residential,commercial,industrial,land'],
            'total_value' => ['required', 'numeric', 'min:0'],
            'token_price' => ['required', 'numeric', 'min:0'],
            'expected_roi' => ['required', 'numeric', 'min:0', 'max:100'],
            'rental_yield' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'appreciation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'dividend_frequency' => ['nullable', 'integer', 'in:1,2,4,12'],
            'min_investment' => ['required', 'numeric', 'min:0'],
            'amenities' => ['nullable', 'array'],
            'features' => ['nullable', 'array'],
            'status' => ['required', 'in:draft,upcoming,active,sold_out,closed'],
            'blockchain' => ['required', 'in:ethereum,bsc,sepolia,bsc_testnet'],
            'contract_address' => ['nullable', 'string'],
            'token_id' => ['nullable', 'integer'],
            'property_size' => ['nullable', 'integer'],
            'property_size_unit' => ['nullable', 'string'],
            'bedrooms' => ['nullable', 'integer'],
            'bathrooms' => ['nullable', 'integer'],
            'year_built' => ['nullable', 'integer'],
            'funding_deadline' => ['nullable', 'date'],
            'is_featured' => ['boolean'],
        ]);

        // Handle new image uploads
        if ($request->hasFile('new_images')) {
            $images = $property->images ?? [];
            foreach ($request->file('new_images') as $image) {
                $path = $image->store('properties', 'public');
                $images[] = Storage::url($path);
            }
            $validated['images'] = $images;
        }

        // Handle image deletions
        if ($request->filled('delete_images')) {
            $images = $property->images ?? [];
            foreach ($request->delete_images as $imageUrl) {
                $images = array_filter($images, fn($img) => $img !== $imageUrl);
                // Delete file from storage
                $path = str_replace('/storage/', '', $imageUrl);
                Storage::disk('public')->delete($path);
            }
            $validated['images'] = array_values($images);
        }

        $property->update($validated);

        return redirect()->route('admin.properties.show', $property)
            ->with('success', 'Property updated successfully.');
    }

    public function destroy(Property $property)
    {
        // Check if property has investments
        if ($property->investments()->exists()) {
            return back()->withErrors(['error' => 'Cannot delete property with existing investments.']);
        }

        // Delete images
        if ($property->images) {
            foreach ($property->images as $imageUrl) {
                $path = str_replace('/storage/', '', $imageUrl);
                Storage::disk('public')->delete($path);
            }
        }

        // Delete documents
        foreach ($property->documents as $document) {
            Storage::disk('public')->delete($document->file_path);
        }

        $property->delete();

        return redirect()->route('admin.properties.index')
            ->with('success', 'Property deleted successfully.');
    }

    public function uploadDocument(Request $request, Property $property)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'type' => ['required', 'string', 'max:50'],
            'category' => ['required', 'in:legal,financial,technical,marketing,compliance,other'],
            'file' => ['required', 'file', 'max:10240'],
            'is_public' => ['boolean'],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $property->documents()->create([
            'name' => $validated['name'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'type' => $validated['type'],
            'category' => $validated['category'],
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'is_public' => $validated['is_public'] ?? false,
            'uploaded_by' => auth()->id(),
        ]);

        return back()->with('success', 'Document uploaded successfully.');
    }

    public function deleteDocument(Property $property, PropertyDocument $document)
    {
        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return back()->with('success', 'Document deleted successfully.');
    }

    public function registerOnBlockchain(Request $request, Property $property)
    {
        $validated = $request->validate([
            'token_id' => ['required', 'integer', 'min:0'],
            'tx_hash' => ['required', 'string', 'regex:/^0x[a-fA-F0-9]{64}$/'],
        ]);

        // Get the blockchain config for this property's blockchain
        $blockchainConfig = \App\Models\BlockchainConfig::where('name', ucfirst($property->blockchain))
            ->orWhere('name', strtoupper($property->blockchain))
            ->first();

        if (!$blockchainConfig) {
            // Try matching by checking testnet names
            $blockchainNameMap = [
                'sepolia' => 'Sepolia',
                'bsc_testnet' => 'BSC Testnet',
                'ethereum' => 'Ethereum',
                'bsc' => 'BNB Chain',
            ];
            $blockchainConfig = \App\Models\BlockchainConfig::where('name', $blockchainNameMap[$property->blockchain] ?? ucfirst($property->blockchain))->first();
        }

        $property->update([
            'token_id' => $validated['token_id'],
            'contract_address' => $blockchainConfig?->contract_address,
        ]);

        return back()->with('success', 'Property registered on blockchain successfully. Token ID: ' . $validated['token_id']);
    }
}
