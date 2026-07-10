import { darkTheme } from "@rainbow-me/rainbowkit";

export function relckoTheme() {
  const base = darkTheme({
    accentColor: "#00D4FF",
    accentColorForeground: "#FFFFFF",
    borderRadius: "large",
    fontStack: "system",
    overlayBlur: "large",
  });

  return {
    ...base,
    colors: {
      ...base.colors,
      accentColor: "#00D4FF",
      accentColorForeground: "#FFFFFF",
      modalBackground: "rgba(10, 10, 10, 0.92)",
      modalBorder: "rgba(255, 255, 255, 0.06)",
      modalText: "#FFFFFF",
      modalTextDim: "rgba(255, 255, 255, 0.6)",
      modalTextSecondary: "rgba(255, 255, 255, 0.6)",
      generalBorder: "rgba(255, 255, 255, 0.06)",
      generalBorderDim: "rgba(255, 255, 255, 0.03)",
      connectButtonBackground: "#050505",
      connectButtonInnerBackground: "rgba(255, 255, 255, 0.02)",
      menuItemBackground: "rgba(255, 255, 255, 0.02)",
      modalBackdrop: "#000000",
      actionButtonBorder: "rgba(255, 255, 255, 0.06)",
      actionButtonBorderMobile: "rgba(255, 255, 255, 0.06)",
      closeButton: "#FFFFFF",
      closeButtonBackground: "rgba(255, 255, 255, 0.06)",
      error: "#FF6B6B",
      standby: "rgba(255, 255, 255, 0.2)",
      connectionIndicator: "#00D4FF",
      downloadBottomCardBackground: "rgba(255, 255, 255, 0.02)",
      downloadTopCardBackground: "rgba(255, 255, 255, 0.03)",
      profileAction: "rgba(255, 255, 255, 0.06)",
      profileActionHover: "rgba(0, 212, 255, 0.1)",
      profileForeground: "rgba(255, 255, 255, 0.02)",
      selectedOptionBorder: "#00D4FF",
      connectButtonBackgroundError: "#FF6B6B",
      connectButtonText: "#FFFFFF",
      connectButtonTextError: "#FFFFFF",
      actionButtonSecondaryBackground: "rgba(255, 255, 255, 0.06)",
    },
    shadows: {
      connectButton: "none",
      dialog: "none",
      profileDetailsAction: "none",
      selectedOption: "0 0 0 2px rgba(0, 212, 255, 0.3)",
      selectedWallet: "0 0 0 2px rgba(0, 212, 255, 0.3)",
      walletLogo: "none",
    },
    radii: {
      actionButton: "12px",
      connectButton: "12px",
      menuButton: "12px",
      modal: "28px",
      modalMobile: "28px",
    },
    blurs: {
      modalOverlay: "24px",
    },
    fonts: {
      body: "var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    },
  };
}
