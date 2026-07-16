<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Agent;
use App\Models\Referral;
use App\Models\Trade;
use App\Models\Commission;
use App\Models\Investment;
use Illuminate\Database\Seeder;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $agent = Agent::first();
        $referredUsers = User::where('referred_by_agent_id', $agent->id)->get();

        // Get referral records
        $referrals = Referral::where('agent_id', $agent->id)->get();

        // Create commissions for trades
        $trades = Trade::whereIn('seller_id', $referredUsers->pluck('id'))
            ->orWhereIn('buyer_id', $referredUsers->pluck('id'))
            ->get();

        foreach ($trades as $trade) {
            $referredUser = $referredUsers->first(function($u) use ($trade) {
                return $u->id === $trade->seller_id || $u->id === $trade->buyer_id;
            });

            if ($referredUser) {
                $referral = $referrals->where('referred_user_id', $referredUser->id)->first();
                if (!$referral) continue;

                $commissionAmount = $trade->total_amount * ($agent->commission_rate / 100);

                $status = 'pending';
                if ($trade->status === 'completed') {
                    $status = rand(0, 1) ? 'approved' : 'paid';
                }

                Commission::create([
                    'agent_id' => $agent->id,
                    'referral_id' => $referral->id,
                    'user_id' => $referredUser->id,
                    'commissionable_type' => Trade::class,
                    'commissionable_id' => $trade->id,
                    'transaction_type' => $referredUser->id === $trade->seller_id ? 'secondary_sell' : 'secondary_buy',
                    'transaction_amount' => $trade->total_amount,
                    'commission_rate' => $agent->commission_rate,
                    'commission_amount' => $commissionAmount,
                    'currency' => 'USD',
                    'status' => $status,
                    'approved_at' => $status !== 'pending' ? now()->subDays(rand(1, 5)) : null,
                    'paid_at' => $status === 'paid' ? now()->subDays(rand(1, 3)) : null,
                ]);

                $this->command->info("Trade commission: \${$commissionAmount} ({$status}) - {$referredUser->name}");
            }
        }

        // Create primary investment commissions
        $this->command->info("\nCreating primary investment commissions...");

        $investmentAmounts = [15000, 8500, 22000];
        foreach ($referredUsers->take(3) as $i => $user) {
            $referral = $referrals->where('referred_user_id', $user->id)->first();
            if (!$referral) continue;

            $investmentAmount = $investmentAmounts[$i];
            $commissionAmount = $investmentAmount * ($agent->commission_rate / 100);

            Commission::create([
                'agent_id' => $agent->id,
                'referral_id' => $referral->id,
                'user_id' => $user->id,
                'commissionable_type' => Investment::class,
                'commissionable_id' => $i + 1,
                'transaction_type' => 'primary_purchase',
                'transaction_amount' => $investmentAmount,
                'commission_rate' => $agent->commission_rate,
                'commission_amount' => $commissionAmount,
                'currency' => 'USD',
                'status' => 'paid',
                'approved_at' => now()->subDays(rand(20, 40)),
                'paid_at' => now()->subDays(rand(15, 30)),
            ]);

            $this->command->info("Primary: \${$commissionAmount} (paid) - {$user->name}");
        }

        // Update agent stats
        $paidEarnings = Commission::where('agent_id', $agent->id)->where('status', 'paid')->sum('commission_amount');
        $approvedEarnings = Commission::where('agent_id', $agent->id)->where('status', 'approved')->sum('commission_amount');
        $pendingEarnings = Commission::where('agent_id', $agent->id)->where('status', 'pending')->sum('commission_amount');

        $agent->update([
            'total_earnings' => $paidEarnings + $approvedEarnings,
            'pending_earnings' => $pendingEarnings,
            'withdrawn_earnings' => $paidEarnings * 0.6,
        ]);

        $this->command->info("\n=== Agent Stats ===");
        $this->command->info("Total Earnings: $" . number_format($paidEarnings + $approvedEarnings, 2));
        $this->command->info("Pending: $" . number_format($pendingEarnings, 2));
        $this->command->info("Total Commissions: " . Commission::count());
    }
}
