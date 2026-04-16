import { db } from "#server/database/connection";
import { workspaces, users } from "#server/database/schema";
import { z } from "zod";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  logoUrl: z.string().url().optional().nullable(),
  // Optional: create first admin user for this workspace
  adminEmail: z.string().email().optional(),
  adminName: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  // Super admin middleware already verified access

  const body = await readBody(event);
  const parsed = CreateWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors.map(e => e.message).join(", "),
    });
  }

  const { name, logoUrl, adminEmail, adminName } = parsed.data;

  // Create the workspace
  const workspaceId = crypto.randomUUID();
  const [newWorkspace] = await db
    .insert(workspaces)
    .values({
      id: workspaceId,
      name,
      logoUrl: logoUrl || null,
    })
    .returning();

  // Optionally create the first admin user for this workspace
  let adminUser = null;
  if (adminEmail) {
    const [createdUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: adminEmail,
        name: adminName || adminEmail,
        emailVerified: false, // Pre-created, will be linked on first OAuth login
        role: "admin", // Workspace admin
        workspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    adminUser = {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
    };
  }

  return {
    success: true,
    workspace: newWorkspace,
    adminUser,
  };
});
