import { describe, it, expect, vi, afterEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

const { sendEmail } = await import("./email");

describe("sendEmail demo-mode suppression", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
    sendMock.mockReset();
  });

  it("does not call Resend when DEMO_MODE is on", async () => {
    process.env.DEMO_MODE = "true";
    const result = await sendEmail({
      to: "a@b.com",
      subject: "hi",
      html: "<p>hi</p>",
    });
    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ suppressed: true });
  });

  it("calls Resend and does not return suppressed when DEMO_MODE is not set", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "x" }, error: null });
    const result = await sendEmail({
      to: "a@b.com",
      subject: "hi",
      html: "<p>hi</p>",
    });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(result).not.toMatchObject({ suppressed: true });
  });
});
