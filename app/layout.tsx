import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
  display: "swap",
});

const SITE_URL = "https://relcko.com";
const SITE_NAME = "Relcko";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Relcko — The Future of Property Investment",
    template: "%s · Relcko",
  },
  description:
    "Relcko is a blockchain-powered real estate tokenization platform. Own fractions of premium buildings through immutable, liquid, on-chain ownership. Starts at $1.",
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "Relcko",
    "real estate tokenization",
    "blockchain property",
    "fractional ownership",
    "tokenized real estate",
    "property investment",
    "SPV",
    "on-chain ownership",
    "smart contracts",
    "real estate blockchain",
  ],
  authors: [{ name: "Relcko" }],
  creator: "Relcko",
  publisher: "Relcko",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Relcko — The Future of Property Investment",
    description:
      "Blockchain-powered real estate tokenization. Own a fraction of the future — starting at $1.",
    images: [
      {
        url: "/frames/ezgif-frame-001.jpg",
        width: 1920,
        height: 1080,
        alt: "Relcko — tokenized premium real estate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Relcko — The Future of Property Investment",
    description:
      "Blockchain-powered real estate tokenization. Own a fraction of the future.",
    images: ["/frames/ezgif-frame-001.jpg"],
  },
  icons: {
    icon: [
      { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230E0F13'/%3E%3Crect x='28' y='22' width='44' height='56' rx='4' fill='none' stroke='%2347C2FF' stroke-width='3'/%3E%3Crect x='40' y='40' width='20' height='38' rx='2' fill='%231E6BFF'/%3E%3C/svg%3E" },
    ],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0E0F13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

// JSON-LD structured data — helps search engines understand the entity
// and powers rich results (Organization + FAQ + WebSite sitelinks).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Relcko",
      url: SITE_URL,
      description:
        "Blockchain-powered real estate tokenization platform.",
      sameAs: [
        "https://twitter.com/relcko",
        "https://linkedin.com/company/relcko",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Relcko",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What exactly do I own?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Each token represents fractional legal ownership of an SPV that holds the building. Your tokens are secured on-chain and verifiable at any time.",
          },
        },
        {
          "@type": "Question",
          name: "How are rental yields paid?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Distributions are streamed directly to your wallet monthly, in stablecoin, proportional to your token holdings. No paperwork, no waiting.",
          },
        },
        {
          "@type": "Question",
          name: "Can I sell my stake?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — the secondary market lets you list tokens any time. Settlement is near-instant and global, 24/7.",
          },
        },
        {
          "@type": "Question",
          name: "Is my investment insured?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The protocol carries institutional custody insurance and audited smart contracts. Physical assets carry property insurance at the SPV level.",
          },
        },
        {
          "@type": "Question",
          name: "What is the minimum?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ownership starts at $1. No accreditation required for retail-grade tranches in supported jurisdictions.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable}`}>
      <head>
        {/* Preload first frame so loader-to-scene transition is seamless */}
        <link rel="preload" as="image" href="/frames/ezgif-frame-001.jpg" fetchPriority="high" />
        {/* Structured data for rich search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased bg-surface-base text-text-primary grain vignette">
        <a href="#top" className="skip-link">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
