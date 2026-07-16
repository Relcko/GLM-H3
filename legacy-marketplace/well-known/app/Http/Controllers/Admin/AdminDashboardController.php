<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use App\Models\Property;
use App\Models\TokenHolding;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_users' => User::count(),
            'total_properties' => Property::count(),
            'active_properties' => Property::where('status', 'active')->count(),
            'total_investments' => Investment::where('status', 'confirmed')->sum('amount_paid'),
            'pending_investments' => Investment::where('status', 'pending')->count(),
            'total_tokens_sold' => Property::sum('sold_tokens'),
        ];

        $recentInvestments = Investment::with(['user', 'property'])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        $recentUsers = User::orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        // Use database-agnostic date formatting
        $dbDriver = DB::connection()->getDriverName();
        $dateFormat = $dbDriver === 'sqlite'
            ? 'strftime("%Y-%m", created_at)'
            : 'DATE_FORMAT(created_at, "%Y-%m")';

        $investmentsByMonth = Investment::where('status', 'confirmed')
            ->select(
                DB::raw($dateFormat . ' as month'),
                DB::raw('SUM(amount_paid) as total'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->take(12)
            ->get();

        $topProperties = Property::withCount(['investments' => function ($query) {
            $query->where('status', 'confirmed');
        }])
            ->orderBy('sold_tokens', 'desc')
            ->take(5)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recentInvestments' => $recentInvestments,
            'recentUsers' => $recentUsers,
            'investmentsByMonth' => $investmentsByMonth,
            'topProperties' => $topProperties,
        ]);
    }
}
