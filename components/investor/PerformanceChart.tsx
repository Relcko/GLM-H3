"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { formatCurrency } from "@/lib/shared/format";
import type { PerformancePoint } from "@/lib/investor/types";

interface Props {
  data: PerformancePoint[];
}

export function PerformanceChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const startValue = data[0].value;
  const endValue = data[data.length - 1].value;
  const totalChange = endValue - startValue;
  const changePercent = ((totalChange / startValue) * 100);
  const isPositive = totalChange >= 0;

  const width = data.length - 1;
  const height = 100;
  const padding = 5;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = (i / width) * 100;
    const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance</CardTitle>
          <span className={`text-sm font-medium tabular-nums ${isPositive ? "text-success-base" : "text-danger-base"}`}>
            {isPositive ? "+" : ""}{changePercent.toFixed(1)}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-44 w-full"
          role="img"
          aria-label={`Performance chart showing ${isPositive ? "an increase" : "a decrease"} of ${Math.abs(changePercent).toFixed(1)}% over ${data.length} periods`}
        >
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="perfFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-base)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-accent-base)" stopOpacity="0.02" />
              </linearGradient>
              <filter id="perfGlow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <polyline
              fill="url(#perfFill)"
              stroke="var(--color-accent-base)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              points={[
                `0,${100 - padding}`,
                ...points,
                `100,${100 - padding}`,
              ].join(" ")}
            />

            <polyline
              fill="none"
              stroke={isPositive ? "var(--color-success-base)" : "var(--color-danger-base)"}
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
              filter="url(#perfGlow)"
              points={points.join(" ")}
            />

            {data.filter((_, i) => i === 0 || i === data.length - 1).map((d, i) => {
              const idx = i === 0 ? 0 : data.length - 1;
              const x = (idx / width) * 100;
              const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="var(--color-accent-base)"
                  stroke="var(--color-bg-base)"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-text-muted">
            <span>{formatCurrency(min)}</span>
            <span>{data.length} periods</span>
            <span>{formatCurrency(max)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
