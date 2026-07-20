import { describe, expect, it } from "vitest";
import { Severity } from "@relcko/types";
import {
  createInMemoryNotificationSink,
  createNotification,
  NotificationChannel,
} from "@relcko/notification-contracts";

describe("notification contracts", () => {
  it("creates and sends notifications to the sink", async () => {
    const sink = createInMemoryNotificationSink();
    const msg = createNotification({
      channel: NotificationChannel.Email,
      recipientId: "user_1" as never,
      title: "Welcome",
      body: "Hello",
      severity: Severity.High,
    });
    const result = await sink.send(msg);
    expect(result.delivered).toBe(true);
    expect(sink.sent()).toHaveLength(1);
  });

  it("sends bulk notifications", async () => {
    const sink = createInMemoryNotificationSink();
    const results = await sink.sendBulk([
      createNotification({ channel: NotificationChannel.InApp, recipientId: "u1" as never, title: "a", body: "b" }),
      createNotification({ channel: NotificationChannel.InApp, recipientId: "u2" as never, title: "c", body: "d" }),
    ]);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.delivered)).toBe(true);
  });
});
