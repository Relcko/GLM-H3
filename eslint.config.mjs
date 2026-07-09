import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Flat ESLint config (ESLint 9 / Next 16).
 *
 * `next lint` was removed in Next 16, and ESLint 9 can no longer load the
 * legacy `.eslintrc.json` that extended `next/core-web-vitals`. This just
 * re-exports the flat config array that `eslint-config-next` ships, so
 * `eslint .` works again.
 */
const config = [...nextCoreWebVitals];

export default config;
