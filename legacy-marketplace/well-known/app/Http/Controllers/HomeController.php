<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $featuredProperties = Property::with('documents')
            ->where('status', 'active')
            ->where('is_featured', true)
            ->take(6)
            ->get();

        $latestProperties = Property::with('documents')
            ->whereIn('status', ['active', 'upcoming'])
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get();

        $stats = [
            'total_properties' => Property::whereIn('status', ['active', 'sold_out'])->count(),
            'total_value' => Property::whereIn('status', ['active', 'sold_out'])->sum('total_value'),
            'total_investors' => \App\Models\TokenHolding::distinct('user_id')->count(),
            'total_invested' => \App\Models\TokenHolding::sum('total_invested'),
        ];

        return Inertia::render('Home', [
            'featuredProperties' => $featuredProperties,
            'latestProperties' => $latestProperties,
            'stats' => $stats,
        ]);
    }

    public function about()
    {
        return Inertia::render('About');
    }

    public function contact()
    {
        return Inertia::render('Contact');
    }

    public function faq()
    {
        return Inertia::render('FAQ');
    }
}
