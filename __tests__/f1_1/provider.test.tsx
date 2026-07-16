// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionProvider, useSession } from "@/components/shared/providers/SessionProvider";
import { NotificationProvider, useNotifications } from "@/components/shared/providers/NotificationProvider";
import { ThemeProvider, useTheme } from "@/components/shared/providers/ThemeProvider";

function TestChild() {
  const session = useSession();
  return <div data-testid="session-state">{session.state}</div>;
}

function TestNotificationChild() {
  const { unreadCount } = useNotifications();
  return <div data-testid="unread">{unreadCount}</div>;
}

function TestThemeChild() {
  const { theme } = useTheme();
  return <div data-testid="theme">{theme}</div>;
}

describe("SessionProvider", () => {
  it("renders children", () => {
    render(
      <SessionProvider>
        <div>child</div>
      </SessionProvider>
    );
    expect(screen.getByText("child")).toBeDefined();
  });

  it("provides session state to children", () => {
    render(
      <SessionProvider>
        <TestChild />
      </SessionProvider>
    );
    expect(screen.getByTestId("session-state").textContent).toBe("anonymous");
  });

  it("throws when useSession is used outside provider", () => {
    expect(() => render(<TestChild />)).toThrow("useSession must be used within SessionProvider");
  });

  it("supports nested composition with NotificationProvider", () => {
    render(
      <SessionProvider>
        <NotificationProvider>
          <TestNotificationChild />
        </NotificationProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId("unread").textContent).toBe("0");
  });
});

describe("ThemeProvider", () => {
  it("renders with default dark theme", () => {
    render(
      <ThemeProvider>
        <TestThemeChild />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("renders with light theme", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestThemeChild />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    expect(() => render(<TestThemeChild />)).toThrow("useTheme must be used within ThemeProvider");
  });
});

describe("Provider Hierarchy", () => {
  it("ThemeProvider can wrap SessionProvider", () => {
    render(
      <ThemeProvider>
        <SessionProvider>
          <TestChild />
        </SessionProvider>
      </ThemeProvider>
    );
    expect(screen.getByTestId("session-state").textContent).toBe("anonymous");
  });

  it("SessionProvider can wrap NotificationProvider", () => {
    render(
      <SessionProvider>
        <NotificationProvider>
          <TestNotificationChild />
        </NotificationProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId("unread").textContent).toBe("0");
  });

  it("full composition — Theme > Session > Notification", () => {
    render(
      <ThemeProvider>
        <SessionProvider>
          <NotificationProvider>
            <TestNotificationChild />
          </NotificationProvider>
        </SessionProvider>
      </ThemeProvider>
    );
    expect(screen.getByTestId("unread").textContent).toBe("0");
  });
});
