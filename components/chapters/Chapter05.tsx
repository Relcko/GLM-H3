"use client";

import { useState, useEffect, useRef } from "react";
import { Section, Container, ContentColumn, Kicker, ChapterNumber } from "@/components/layout";
import { Reveal, SplitWords } from "@/components/Reveal";
import Counter from "@/components/Counter";
import RLKOCalculator from "@/components/RLKOCalculator";

const STATS = [
  { to: 12.4, dec: 1, pfx: "",  sfx: "%", label: "Avg. annual yield",  sub: "Net rental income"    },
  { to: 38.2, dec: 1, pfx: "",  sfx: "%", label: "5-yr appreciation",  sub: "Capital growth"       },
  { to: 24,   dec: 0, pfx: "",  sfx: "h", label: "Liquidity",           sub: "Secondary market exit"},
  { to: 142,  dec: 0, pfx: "$", sfx: "M", label: "Assets tokenized",   sub: "Across 7 markets"     },
];

export default function Chapter05() {
  return (
    <Section
      id="chapter-05"
      height="tall"
      center
      aria-labelledby="chapter-05-title"
    >
      <Container>
        <ContentColumn side="right" width="reading">
          <Reveal className="flex items-center gap-4">
            <ChapterNumber index="05" />
            <span className="h-px w-10 bg-white/20" />
            <Kicker>Investment</Kicker>
          </Reveal>

          <h2
            id="chapter-05-title"
            className="font-display text-chapter font-light gradient-text text-balance"
          >
            Wealth, compounded.
          </h2>

          <Reveal className="max-w-sm text-balance text-sm leading-relaxed text-white/50">
            Real estate returns, without the friction. Distributions settle
            automatically. Your portfolio, live on-chain.
          </Reveal>

          {/* Stat cards */}
          <div className="grid w-full grid-cols-2 gap-3">
            {STATS.map((s, i) => (
              <Reveal
                key={s.label}
                delay={i * 0.08}
                className="group relative overflow-hidden rounded-2xl glass card-interactive p-4"
              >
                <div className="font-display text-3xl font-semibold gradient-text sm:text-4xl">
                  <Counter to={s.to} decimals={s.dec} prefix={s.pfx} suffix={s.sfx} />
                </div>
                <div className="mt-1.5 text-sm font-medium text-white/80">{s.label}</div>
                <div className="text-xs text-white/45">{s.sub}</div>
              </Reveal>
            ))}
          </div>

          {/* RLKO Rewards Calculator */}
          <Reveal delay={0.2} className="w-full">
            <RLKOCalculator />
          </Reveal>

          {/* Trading Chart */}
          <Reveal delay={0.35} className="w-full">
            <TradingChart />
          </Reveal>
        </ContentColumn>
      </Container>
    </Section>
  );
}

// ── Trading Chart ─────────────────────────────────────────────────────────────

const BASE_PTS = [12, 15, 11, 18, 22, 19, 28, 25, 32, 30, 38, 35, 44, 42, 52, 49, 58, 55, 64, 62, 72, 68, 78, 74, 82, 79, 88, 85, 92, 96];
const YEAR_LABELS = ["2024", "2025", "2026", "2027", "2028", "2029"];
const W = 400;
const H = 110;
const PAD = { top: 12, right: 8, bottom: 24, left: 36 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function toSVG(pts: number[]) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  return pts.map((p, i) => ({
    x: PAD.left + (i / (pts.length - 1)) * CW,
    y: PAD.top + CH - ((p - min) / range) * CH,
  }));
}

function buildPath(coords: { x: number; y: number }[]) {
  return coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");
}

function TradingChart() {
  const [tick, setTick] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);

  // Micro-fluctuation: nudge last few points slightly each tick
  const pts = BASE_PTS.map((p, i) => {
    if (i < BASE_PTS.length - 4) return p;
    const wave = Math.sin(tick * 0.4 + i * 1.2) * 1.8;
    return p + wave;
  });

  const coords = toSVG(pts);
  const linePath = buildPath(coords);
  const areaPath = `${linePath} L${(PAD.left + CW).toFixed(2)},${(PAD.top + CH).toFixed(2)} L${PAD.left.toFixed(2)},${(PAD.top + CH).toFixed(2)} Z`;

  const tip = coords[coords.length - 1];
  const hCoord = hoverIdx !== null ? coords[hoverIdx] : null;

  // Measure path length for draw animation
  useEffect(() => {
    if (pathRef.current) {
      setPathLen(pathRef.current.getTotalLength());
      setTimeout(() => setDrawn(true), 100);
    }
  }, []);

  // Live ticker loop
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  // Y-axis grid values
  const minP = Math.min(...pts);
  const maxP = Math.max(...pts);
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    (minP + (maxP - minP) * f).toFixed(0)
  );

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-medium text-white/60">Portfolio · 5-year projection</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6rem] text-white/30">RLKO/USD</span>
          <span className="font-mono text-xs font-medium text-success">+74.8%</span>
        </div>
      </div>

      {/* Chart */}
      <div
        className="relative px-1 pb-1"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: 120 }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xRel = ((e.clientX - rect.left) / rect.width) * W;
            let closest = 0;
            let minDist = Infinity;
            coords.forEach((c, i) => {
              const d = Math.abs(c.x - xRel);
              if (d < minDist) { minDist = d; closest = i; }
            });
            setHoverIdx(closest);
          }}
        >
          <defs>
            <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#0057FF" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Y-axis grid lines */}
          {gridVals.map((_, i) => {
            const y = PAD.top + CH - (i / 4) * CH;
            return (
              <line
                key={i}
                x1={PAD.left} y1={y}
                x2={PAD.left + CW} y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Y-axis labels */}
          {gridVals.map((v, i) => (
            <text
              key={i}
              x={PAD.left - 4}
              y={PAD.top + CH - (i / 4) * CH + 3}
              textAnchor="end"
              fontSize="6"
              fill="rgba(255,255,255,0.2)"
              fontFamily="monospace"
            >
              {v}
            </text>
          ))}

          {/* X-axis year labels */}
          {YEAR_LABELS.map((yr, i) => (
            <text
              key={yr}
              x={PAD.left + (i / (YEAR_LABELS.length - 1)) * CW}
              y={H - 6}
              textAnchor="middle"
              fontSize="6"
              fill="rgba(255,255,255,0.2)"
              fontFamily="monospace"
            >
              {yr}
            </text>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGrad)" />

          {/* Line — draw animation via strokeDashoffset */}
          <path
            ref={pathRef}
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            filter="url(#glow)"
            style={{
              strokeDasharray: pathLen || 9999,
              strokeDashoffset: drawn ? 0 : (pathLen || 9999),
              transition: drawn ? "stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)" : "none",
            }}
          />

          {/* Hover crosshair */}
          {hCoord && (
            <>
              <line
                x1={hCoord.x} y1={PAD.top}
                x2={hCoord.x} y2={PAD.top + CH}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
              <circle cx={hCoord.x} cy={hCoord.y} r="3" fill="#00D4FF" opacity="0.9" />
              <circle cx={hCoord.x} cy={hCoord.y} r="5" fill="none" stroke="#00D4FF" strokeWidth="0.8" opacity="0.4" />
              {/* Hover value bubble */}
              <rect
                x={Math.min(hCoord.x - 14, PAD.left + CW - 28)}
                y={hCoord.y - 16}
                width="28" height="11"
                rx="3"
                fill="rgba(0,212,255,0.15)"
                stroke="rgba(0,212,255,0.3)"
                strokeWidth="0.5"
              />
              <text
                x={Math.min(hCoord.x, PAD.left + CW - 14)}
                y={hCoord.y - 8}
                textAnchor="middle"
                fontSize="5.5"
                fill="#00D4FF"
                fontFamily="monospace"
              >
                {pts[hoverIdx!].toFixed(1)}
              </text>
            </>
          )}

          {/* Live tip dot */}
          {!hCoord && (
            <>
              <circle cx={tip.x} cy={tip.y} r="2.5" fill="#00D4FF" filter="url(#glow)" />
              <circle cx={tip.x} cy={tip.y} r="5" fill="none" stroke="#00D4FF" strokeWidth="0.6" opacity="0.4">
                <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
