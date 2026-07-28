import { describe, it, expect } from "vitest";
import { auth } from "./auth";

// F1 (Critical): the privilege- and tenancy-bearing better-auth additionalFields
// must be input:false so they cannot be set through the public
// /api/auth/update-user endpoint. If input:false is ever dropped, any
// authenticated user could self-promote to platform super-admin or relocate
// into another tenant in a single request. This test is the regression guard on
// that control - it asserts the actual constructed better-auth config, which is
// what governs the endpoint.
describe("better-auth privileged additionalFields are not self-editable (F1)", () => {
  const additionalFields = (
    auth as unknown as {
      options: {
        user: { additionalFields: Record<string, { input?: boolean }> };
      };
    }
  ).options.user.additionalFields;

  it.each(["isSuperAdmin", "workspaceId", "roleType", "buddyId"])(
    "field %s is locked with input: false",
    (field) => {
      expect(additionalFields[field]).toBeDefined();
      expect(additionalFields[field]?.input).toBe(false);
    },
  );

  it("leaves ordinary self-service profile fields editable", () => {
    // Sanity check that we locked only the privileged fields: a user must still
    // be able to edit their own profile details.
    expect(additionalFields.preferredName?.input).not.toBe(false);
    expect(additionalFields.bio?.input).not.toBe(false);
    expect(additionalFields.timezone?.input).not.toBe(false);
  });
});
