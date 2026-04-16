import { auth } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
  try {
    return await auth.handler(toWebRequest(event));
  } catch (error: any) {
    // Check if this is an invitation/authorization error
    const errorMessage = error?.message || error?.toString() || "";

    if (
      errorMessage.includes("invited") ||
      errorMessage.includes("invitation") ||
      errorMessage.includes("workspace") ||
      error?.code === "FORBIDDEN"
    ) {
      // Redirect to login page with error message
      const encodedError = encodeURIComponent("You haven't been invited to this workspace. Contact your admin for access.");
      return sendRedirect(event, `/login?error=${encodedError}`, 302);
    }

    // For other errors, let Better Auth handle it
    throw error;
  }
});
