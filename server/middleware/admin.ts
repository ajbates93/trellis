import { auth } from "../utils/auth";

export default defineEventHandler(async (event) => {
  // Only check admin routes
  const adminRoutes = ['/api/admin']
  const path = event.path

  if (!adminRoutes.some(route => path.startsWith(route))) {
    return
  }

  // Get session from Better Auth
  const session = await auth.api.getSession({ headers: event.headers });

  if (!session?.user || session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin access required',
    })
  }

  // Attach user to context for use in API routes
  event.context.user = session.user;
})
