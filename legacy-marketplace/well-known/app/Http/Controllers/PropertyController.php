<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $query = Property::with('documents')
            ->whereIn('status', ['active', 'upcoming', 'sold_out']);

        // Filters
        if ($request->filled('type')) {
            $query->where('property_type', $request->type);
        }

        if ($request->filled('location')) {
            $query->where('city', 'like', "%{$request->location}%")
                ->orWhere('country', 'like', "%{$request->location}%");
        }

        if ($request->filled('min_price')) {
            $query->where('min_investment', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('min_investment', '<=', $request->max_price);
        }

        if ($request->filled('blockchain')) {
            $query->where('blockchain', $request->blockchain);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');

        if (in_array($sortField, ['created_at', 'token_price', 'expected_roi', 'total_value'])) {
            $query->orderBy($sortField, $sortDirection);
        }

        $properties = $query->paginate(12)->withQueryString();

        return Inertia::render('Properties/Index', [
            'properties' => $properties,
            'filters' => $request->only(['type', 'location', 'min_price', 'max_price', 'blockchain', 'status', 'sort', 'direction']),
        ]);
    }

    public function show(Property $property)
    {
        $property->load(['documents', 'dividends' => function ($query) {
            $query->where('status', 'completed')->orderBy('payment_date', 'desc')->take(5);
        }]);

        $relatedProperties = Property::where('id', '!=', $property->id)
            ->where('property_type', $property->property_type)
            ->where('status', 'active')
            ->take(4)
            ->get();

        $investorCount = $property->tokenHoldings()->distinct('user_id')->count();

        return Inertia::render('Properties/Show', [
            'property' => $property,
            'relatedProperties' => $relatedProperties,
            'investorCount' => $investorCount,
        ]);
    }
}
