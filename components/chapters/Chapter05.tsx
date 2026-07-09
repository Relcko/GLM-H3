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

          <Reveal className="max-w-[20rem] text-balance text-sm leading-relaxed text-white/50">
            Real estate returns, without the friction. Your portfolio,
            live on-chain.
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

  return (
    <div className="glass-strong rounded-3xl overflow-hidden border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="text-xs font-medium tracking-wide text-white/55">
            Portfolio · 5-year projection
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.6rem] text-white/25">RLKO/USD</span>
          <span className="font-mono text-xs font-medium text-white/75">+74.8%</span>
        </div>
      </div>

      {/* Chart */}
      <div
        className="relative px-2 pb-2"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: 124 }}
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
            {/* Monochrome area + line — no chroma, just light. */}
            <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>
            {/* Very faint line softness — a hint of glow, not bloom. */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Single baseline rule — architectural, minimal */}
          <line
            x1={PAD.left} y1={PAD.top + CH}
            x2={PAD.left + CW} y2={PAD.top + CH}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.5"
          />

          {/* X-axis year labels — quiet, monochrome */}
          {YEAR_LABELS.map((yr, i) => (
            <text
              key={yr}
              x={PAD.left + (i / (YEAR_LABELS.length - 1)) * CW}
              y={H - 5}
              textAnchor="middle"
              fontSize="6"
              fill="rgba(255,255,255,0.22)"
              fontFamily="monospace"
            >
              {yr}
            </text>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGrad)" />

          {/* Line — draw-on animation via strokeDashoffset */}
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

          {/* Hover crosshair — monochrome, restrained */}
          {hCoord && (
            <>
              <line
                x1={hCoord.x} y1={PAD.top}
                x2={hCoord.x} y2={PAD.top + CH}
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
              <circle cx={hCoord.x} cy={hCoord.y} r="3" fill="#ffffff" opacity="0.95" />
              <circle cx={hCoord.x} cy={hCoord.y} r="5.5" fill="none" stroke="#ffffff" strokeWidth="0.7" opacity="0.35" />
              <rect
                x={Math.min(hCoord.x - 13, PAD.left + CW - 26)}
                y={hCoord.y - 15}
                width="26" height="10"
                rx="3"
                fill="rgba(255,255,255,0.10)"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.5"
              />
              <text
                x={Math.min(hCoord.x, PAD.left + CW - 13)}
                y={hCoord.y - 8}
                textAnchor="middle"
                fontSize="5.5"
                fill="rgba(255,255,255,0.85)"
                fontFamily="monospace"
              >
                {pts[hoverIdx!].toFixed(1)}
              </text>
            </>
          )}

          {/* Live tip — a quiet white point, no pulsing ring */}
          {!hCoord && (
            <>
              <circle cx={tip.x} cy={tip.y} r="2.5" fill="#ffffff" filter="url(#glow)" />
              <circle cx={tip.x} cy={tip.y} r="5" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
