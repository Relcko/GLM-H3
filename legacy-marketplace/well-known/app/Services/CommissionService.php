<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Commission;
use App\Models\Investment;
use App\Models\Referral;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CommissionService
{
    /**
     * Process commission for primary purchase (buying from platform)
     */
    public function processPrimaryPurchaseCommission(Investment $investment): ?Commission
    {
        $user = $investment->user;

        // Check if user was referred by an agent
        if (!$user->hasReferrer()) {
            return null;
        }

        $agent = $user->referredByAgent;

        // Check if agent is active
        if (!$agent || !$agent->isActive()) {
            return null;
        }

        // Get the referral record
        $referral = Referral::where('agent_id', $agent->id)
            ->where('referred_user_id', $user->id)
            ->first();

        if (!$referral) {
            return null;
        }

        // Mark referral as active if this is the first transaction
        if (!$referral->first_transaction_at) {
            $referral->markAsActive();
        }

        // Calculate commission
        $transactionAmount = $investment->amount_paid;
        $commissionRate = $agent->commission_rate;
        $commissionAmount = Commission::calculateCommission($transactionAmount, $commissionRate);

        if ($commissionAmount <= 0) {
            return null;
        }

        // Create commission record
        return Commission::create([
            'agent_id' => $agent->id,
            'referral_id' => $referral->id,
            'user_id' => $user->id,
            'commissionable_type' => Investment::class,
            'commissionable_id' => $investment->id,
            'transaction_type' => 'primary_purchase',
            'transaction_amount' => $transactionAmount,
            'commission_rate' => $commissionRate,
            'commission_amount' => $commissionAmount,
            'currency' => $investment->payment_currency,
            'status' => 'pending',
        ]);
    }

    /**
     * Process commission for secondary market trade
     */
    public function processTradeCommission(Trade $trade): array
    {
        $commissions = [];

        // Process commission for buyer (if referred)
        $buyerCommission = $this->processTradeCommissionForUser(
            $trade,
            $trade->buyer,
            'secondary_buy'
        );
        if ($buyerCommission) {
            $commissions[] = $buyerCommission;
        }

        // Process commission for seller (if referred)
        $sellerCommission = $this->processTradeCommissionForUser(
            $trade,
            $trade->seller,
            'secondary_sell'
        );
        if ($sellerCommission) {
            $commissions[] = $sellerCommission;
        }

        return $commissions;
    }

    /**
     * Process trade commission for a specific user
     */
    private function processTradeCommissionForUser(Trade $trade, User $user, string $type): ?Commission
    {
        if (!$user->hasReferrer()) {
            return null;
        }

        $agent = $user->referredByAgent;

        if (!$agent || !$agent->isActive()) {
            return null;
        }

        $referral = Referral::where('agent_id', $agent->id)
            ->where('referred_user_id', $user->id)
            ->first();

        if (!$referral) {
            return null;
        }

        // Mark referral as active if this is the first transaction
        if (!$referral->first_transaction_at) {
            $referral->markAsActive();
        }

        $transactionAmount = $trade->total_amount;
        $commissionRate = $agent->commission_rate;
        $commissionAmount = Commission::calculateCommission($transactionAmount, $commissionRate);

        if ($commissionAmount <= 0) {
            return null;
        }

        return Commission::create([
            'agent_id' => $agent->id,
            'referral_id' => $referral->id,
            'user_id' => $user->id,
            'commissionable_type' => Trade::class,
            'commissionable_id' => $trade->id,
            'transaction_type' => $type,
            'transaction_amount' => $transactionAmount,
            'commission_rate' => $commissionRate,
            'commission_amount' => $commissionAmount,
            'currency' => $trade->currency,
            'status' => 'pending',
        ]);
    }

    /**
     * Register a referral when user signs up with referral code
     */
    public function registerReferral(User $user, string $referralCode): ?Referral
    {
        $agent = Agent::where('agent_code', $referralCode)
            ->where('status', 'active')
            ->first();

        if (!$agent) {
            return null;
        }

        // Can't refer yourself
        if ($agent->user_id === $user->id) {
            return null;
        }

        // Check if already referred
        if ($user->referred_by_agent_id) {
            return null;
        }

        return DB::transaction(function () use ($user, $agent) {
            // Update user with referral info
            $user->update([
                'referred_by_code' => $agent->agent_code,
                'referred_by_agent_id' => $agent->id,
            ]);

            // Create referral record
            return Referral::create([
                'agent_id' => $agent->id,
                'referred_user_id' => $user->id,
                'status' => 'pending',
                'registered_at' => now(),
            ]);
        });
    }

    /**
     * Get agent statistics
     */
    public function getAgentStats(Agent $agent): array
    {
        $totalReferrals = $agent->referrals()->count();
        $activeReferrals = $agent->referrals()->where('status', 'active')->count();
        $pendingCommissions = $agent->commissions()->pending()->sum('commission_amount');
        $approvedCommissions = $agent->commissions()->approved()->sum('commission_amount');
        $paidCommissions = $agent->commissions()->paid()->sum('commission_amount');

        return [
            'total_referrals' => $totalReferrals,
            'active_referrals' => $activeReferrals,
            'pending_commissions' => $pendingCommissions,
            'approved_commissions' => $approvedCommissions,
            'paid_commissions' => $paidCommissions,
            'total_earnings' => $agent->total_earnings,
            'available_balance' => $agent->available_balance,
        ];
    }
}
