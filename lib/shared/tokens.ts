export const COLOR_TOKEN = {
  brand: {
    primary: "var(--color-brand-primary)",
    secondary: "var(--color-brand-secondary)",
    accent: "var(--color-brand-accent)",
  },
  surface: {
    base: "var(--color-surface-base)",
    secondary: "var(--color-surface-secondary)",
    elevated: "var(--color-surface-elevated)",
    modal: "var(--color-surface-modal)",
  },
  text: {
    primary: "var(--color-text-primary)",
    secondary: "var(--color-text-secondary)",
    muted: "var(--color-text-muted)",
    inverse: "var(--color-text-inverse)",
    link: "var(--color-text-link)",
  },
  border: {
    default: "var(--color-border-default)",
    muted: "var(--color-border-muted)",
    strong: "var(--color-border-strong)",
  },
  financial: {
    positive: "var(--color-financial-positive)",
    caution: "var(--color-financial-caution)",
    negative: "var(--color-financial-negative)",
  },
  severity: {
    info: "var(--color-severity-info)",
    low: "var(--color-severity-low)",
    medium: "var(--color-severity-medium)",
    high: "var(--color-severity-high)",
    critical: "var(--color-severity-critical)",
  },
  chart: {
    categorical: ["var(--color-chart-cat-1)", "var(--color-chart-cat-2)", "var(--color-chart-cat-3)", "var(--color-chart-cat-4)", "var(--color-chart-cat-5)"],
    sequential: ["var(--color-chart-seq-1)", "var(--color-chart-seq-2)", "var(--color-chart-seq-3)", "var(--color-chart-seq-4)", "var(--color-chart-seq-5)"],
  },
} as const;

export const TYPOGRAPHY_TOKEN = {
  family: {
    sans: "var(--font-family-sans)",
    display: "var(--font-family-display)",
    mono: "var(--font-family-mono)",
  },
  size: {
    display: "var(--font-size-display)",
    heading1: "var(--font-size-h1)",
    heading2: "var(--font-size-h2)",
    heading3: "var(--font-size-h3)",
    heading4: "var(--font-size-h4)",
    body: "var(--font-size-body)",
    bodySmall: "var(--font-size-body-small)",
    label: "var(--font-size-label)",
    caption: "var(--font-size-caption)",
    mono: "var(--font-size-mono)",
  },
  weight: {
    light: "var(--font-weight-light)",
    regular: "var(--font-weight-regular)",
    medium: "var(--font-weight-medium)",
    semibold: "var(--font-weight-semibold)",
    bold: "var(--font-weight-bold)",
  },
  leading: {
    tight: "var(--font-leading-tight)",
    normal: "var(--font-leading-normal)",
    relaxed: "var(--font-leading-relaxed)",
  },
  tracking: {
    tight: "var(--font-tracking-tight)",
    normal: "var(--font-tracking-normal)",
    wide: "var(--font-tracking-wide)",
    uppercase: "var(--font-tracking-uppercase)",
  },
} as const;

export const SPACING_TOKEN = {
  inset: {
    xs: "var(--spacing-inset-xs)",
    sm: "var(--spacing-inset-sm)",
    md: "var(--spacing-inset-md)",
    lg: "var(--spacing-inset-lg)",
  },
  stack: {
    xs: "var(--spacing-stack-xs)",
    sm: "var(--spacing-stack-sm)",
    md: "var(--spacing-stack-md)",
    lg: "var(--spacing-stack-lg)",
    xl: "var(--spacing-stack-xl)",
  },
  inline: {
    xs: "var(--spacing-inline-xs)",
    sm: "var(--spacing-inline-sm)",
    md: "var(--spacing-inline-md)",
    lg: "var(--spacing-inline-lg)",
  },
  gutter: {
    sm: "var(--spacing-gutter-sm)",
    md: "var(--spacing-gutter-md)",
    lg: "var(--spacing-gutter-lg)",
  },
  section: {
    sm: "var(--spacing-section-sm)",
    md: "var(--spacing-section-md)",
    lg: "var(--spacing-section-lg)",
  },
} as const;

export const ELEVATION_TOKEN = {
  base: "var(--elevation-base)",
  raised: "var(--elevation-raised)",
  floating: "var(--elevation-floating)",
  overlay: "var(--elevation-overlay)",
  modal: "var(--elevation-modal)",
  emergency: "var(--elevation-emergency)",
} as const;

export const MOTION_TOKEN = {
  duration: {
    fast: "var(--motion-duration-fast)",
    normal: "var(--motion-duration-normal)",
    slow: "var(--motion-duration-slow)",
  },
  ease: {
    standard: "var(--motion-ease-standard)",
    emphasized: "var(--motion-ease-emphasized)",
    exit: "var(--motion-ease-exit)",
  },
} as const;

export const RADIUS_TOKEN = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  full: "var(--radius-full)",
} as const;

export const Z_TOKEN = {
  base: "var(--z-base)",
  dropdown: "var(--z-dropdown)",
  sticky: "var(--z-sticky)",
  overlay: "var(--z-overlay)",
  modal: "var(--z-modal)",
  command: "var(--z-command)",
  toast: "var(--z-toast)",
  emergency: "var(--z-emergency)",
} as const;
