"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          .ge-card {
            width: 100%;
            max-width: 28rem;
            background: linear-gradient(135deg, rgba(12,12,14,0.65) 0%, rgba(8,8,10,0.55) 100%);
            -webkit-backdrop-filter: blur(36px) saturate(200%);
            backdrop-filter: blur(36px) saturate(200%);
            border: 1px solid rgba(255,255,255,0.06);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.09), 0 12px 40px -12px rgba(0,0,0,0.5);
            border-radius: 1rem;
            padding: 2.5rem 2rem;
            text-align: center;
            box-sizing: border-box;
          }
          .ge-eyebrow {
            font-family: var(--font-mono), ui-monospace, monospace;
            font-size: 0.7rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: rgba(71,194,255,0.7);
            margin: 0;
          }
          .ge-title {
            font-family: var(--font-display), Georgia, serif;
            font-size: 2rem;
            font-weight: 300;
            letter-spacing: -0.02em;
            margin: 1rem 0 0;
            color: #fff;
          }
          .ge-body {
            font-size: 0.875rem;
            line-height: 1.6;
            color: rgba(240,240,242,0.55);
            margin: 1rem 0 0;
          }
          .ge-actions {
            margin-top: 2rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .ge-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 0.75rem 1.5rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            font-family: var(--font-inter), system-ui, sans-serif;
            text-decoration: none;
            cursor: pointer;
            transition: box-shadow 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s cubic-bezier(0.16,1,0.3,1), color 0.3s cubic-bezier(0.16,1,0.3,1);
          }
          .ge-btn-primary {
            background: #47C2FF;
            color: #0E0F13;
            border: 1px solid transparent;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 24px -8px rgba(255,255,255,0.15), 0 2px 8px -2px rgba(0,0,0,0.2);
          }
          .ge-btn-primary:hover {
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 12px 32px -8px rgba(255,255,255,0.25), 0 4px 12px -2px rgba(0,0,0,0.3);
          }
          .ge-btn-ghost {
            background: transparent;
            color: rgba(240,240,242,0.7);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .ge-btn-ghost:hover {
            color: #fff;
            border-color: rgba(255,255,255,0.2);
          }
          .ge-btn:focus-visible {
            outline: 2px solid #47C2FF;
            outline-offset: 2px;
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0E0F13",
          color: "#f0f0f2",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div className="ge-card" role="alert">
          <p className="ge-eyebrow">Relcko</p>
          <h1 className="ge-title">Something went wrong</h1>
          <p className="ge-body">
            An unexpected error occurred while loading this page.
            <br />
            Please try again.
          </p>

          <div className="ge-actions">
            <button type="button" onClick={reset} className="ge-btn ge-btn-primary">
              Try Again
            </button>
            <Link href="/presale" className="ge-btn ge-btn-ghost">
              Return to Dashboard
            </Link>
            <Link href="/" className="ge-btn ge-btn-ghost">
              Return to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
