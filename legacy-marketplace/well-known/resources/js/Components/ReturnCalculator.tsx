import { useState, useMemo } from 'react';
import { CalculatorIcon } from '@heroicons/react/24/outline';

interface ReturnCalculatorProps {
    property: {
        token_price: number;
        expected_roi: number;
        rental_yield: number;
        appreciation_rate?: number;
        dividend_frequency?: number;
        min_investment: number;
        total_tokens: number;
        available_tokens: number;
    };
}

export default function ReturnCalculator({ property }: ReturnCalculatorProps) {
    const [investmentAmount, setInvestmentAmount] = useState(property.min_investment || 1000);
    const holdingPeriod = 5; // Fixed 5-year projection

    const maxInvestment = Math.min(property.available_tokens * property.token_price, 100000);
    const minInvestment = property.min_investment || property.token_price;

    const calculations = useMemo(() => {
        const rentalYield = Number(property.rental_yield) || 5;
        const appreciationRate = Number(property.appreciation_rate) || 3;

        const tokensPurchased = Math.floor(investmentAmount / property.token_price);
        const actualInvestment = tokensPurchased * property.token_price;
        const annualDividend = actualInvestment * (rentalYield / 100);
        const totalDividends = annualDividend * holdingPeriod;
        const appreciatedValue = actualInvestment * Math.pow(1 + appreciationRate / 100, holdingPeriod);
        const appreciationGain = appreciatedValue - actualInvestment;
        const totalReturn = totalDividends + appreciationGain;
        const totalValue = actualInvestment + totalReturn;
        const roiPercentage = actualInvestment > 0 ? (totalReturn / actualInvestment) * 100 : 0;

        return {
            tokensPurchased,
            actualInvestment,
            annualDividend,
            totalDividends,
            appreciationGain,
            totalReturn,
            totalValue,
            roiPercentage,
            rentalYield,
            appreciationRate,
        };
    }, [investmentAmount, property]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const sliderPercentage = ((investmentAmount - minInvestment) / (maxInvestment - minInvestment)) * 100;

    return (
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <CalculatorIcon className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Return Calculator</h3>
                <span className="ml-auto text-xs text-gray-400">5-Year Projection</span>
            </div>

            <div className="p-4 space-y-4">
                {/* Investment Amount */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Investment Amount</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                            {formatCurrency(investmentAmount)}
                        </span>
                    </div>

                    {/* Custom Styled Slider */}
                    <div className="relative">
                        <input
                            type="range"
                            min={minInvestment}
                            max={maxInvestment}
                            step={property.token_price}
                            value={investmentAmount}
                            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                            className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-5
                                [&::-webkit-slider-thumb]:h-5
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-white
                                [&::-webkit-slider-thumb]:border-[3px]
                                [&::-webkit-slider-thumb]:border-emerald-500
                                [&::-webkit-slider-thumb]:shadow-lg
                                [&::-webkit-slider-thumb]:cursor-grab
                                [&::-webkit-slider-thumb]:active:cursor-grabbing
                                [&::-webkit-slider-thumb]:hover:scale-110
                                [&::-webkit-slider-thumb]:transition-transform
                                [&::-moz-range-thumb]:w-5
                                [&::-moz-range-thumb]:h-5
                                [&::-moz-range-thumb]:rounded-full
                                [&::-moz-range-thumb]:bg-white
                                [&::-moz-range-thumb]:border-[3px]
                                [&::-moz-range-thumb]:border-emerald-500
                                [&::-moz-range-thumb]:shadow-lg
                                [&::-moz-range-thumb]:cursor-grab"
                            style={{
                                background: `linear-gradient(to right, #10b981 0%, #14b8a6 ${sliderPercentage}%, #e5e7eb ${sliderPercentage}%, #e5e7eb 100%)`
                            }}
                        />
                    </div>

                    <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                        <span>{formatCurrency(minInvestment)}</span>
                        <span className="text-emerald-500 font-medium">Drag to adjust</span>
                        <span>{formatCurrency(maxInvestment)}</span>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Annual Income</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(calculations.annualDividend)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">5Y Appreciation</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(calculations.appreciationGain)}</p>
                    </div>
                </div>

                {/* Total Return */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-emerald-100">5-Year Total Return</p>
                            <p className="text-lg font-bold">{formatCurrency(calculations.totalReturn)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-emerald-100">ROI</p>
                            <p className="text-lg font-bold">+{calculations.roiPercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/20 flex justify-between text-xs">
                        <span>{formatCurrency(calculations.actualInvestment)} → {formatCurrency(calculations.totalValue)}</span>
                    </div>
                </div>

                <p className="text-[9px] text-gray-400 italic text-center">
                    * Estimates based on {calculations.rentalYield}% yield + {calculations.appreciationRate}% appreciation
                </p>
            </div>
        </div>
    );
}
