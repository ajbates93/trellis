import { db } from "../../../database/connection";
import { users, onboardingImports } from "../../../database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "../../../utils/auth";
import { validateBody, validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";
import { getWorkspaceId } from "../../../utils/workspace";

export default defineEventHandler(async (event) => {
  try {
    // Get current admin user from session
    const session = await auth.api.getSession({ headers: event.headers });

    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    const adminId = session.user.id;

    // Get workspace ID from current admin
    const workspaceId = getWorkspaceId(event);

    // Validate request body
    const body = await validateBody(event, apiSchemas.OnboardingImportRequestSchema);
    const csvContent = body.csv;
    const filename = body.filename;

    // Parse CSV (simple parsing - split by lines and commas)
    const lines = csvContent.trim().split("\n");

    if (lines.length < 2) {
      throw createError({
        statusCode: 400,
        message: "CSV must have at least a header row and one data row",
      });
    }

    // Validate header
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const requiredFields = ["email", "name"];

    for (const field of requiredFields) {
      if (!header.includes(field)) {
        throw createError({
          statusCode: 400,
          message: `CSV missing required field: ${field}`,
        });
      }
    }

    // Parse data rows
    const rows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(",").map((v) => v.trim());
      const row: any = {};

      header.forEach((key, index) => {
        row[key] = values[index] || "";
      });

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        errors.push({
          row: i + 1,
          field: "email",
          message: `Invalid email format: ${row.email}`,
        });
        continue;
      }

      // Validate name is not empty
      if (!row.name || row.name.trim() === "") {
        errors.push({
          row: i + 1,
          field: "name",
          message: "Name cannot be empty",
        });
        continue;
      }

      // Validate roleType if provided
      if (row.roletype && !["dev", "design", "qa", "growth"].includes(row.roletype)) {
        errors.push({
          row: i + 1,
          field: "roleType",
          message: `Invalid role type: ${row.roletype}. Must be dev, design, qa, or growth`,
        });
        continue;
      }

      rows.push({
        email: row.email,
        name: row.name,
        roleType: row.roletype || undefined,
        buddyEmail: row.buddyemail || undefined,
        nextReviewDate: row.nextreviewdate || undefined,
      });
    }

    // Check for duplicate emails within the CSV
    const emailSet = new Set<string>();
    rows.forEach((row, index) => {
      if (emailSet.has(row.email)) {
        errors.push({
          row: index + 2, // +2 because index is 0-based and we skip header
          field: "email",
          message: `Duplicate email in CSV: ${row.email}`,
        });
      } else {
        emailSet.add(row.email);
      }
    });

    // Check for existing users in database
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, row.email))
        .limit(1);

      if (existingUser.length > 0) {
        errors.push({
          row: i + 2,
          field: "email",
          message: `User already exists: ${row.email}`,
        });
      }
    }

    // If there are validation errors, return them without importing
    if (errors.length > 0) {
      // Log failed import
      await db.insert(onboardingImports).values({
        adminId,
        filename: filename || "unknown.csv",
        rowsImported: 0,
        status: "failed",
        errorLog: JSON.stringify(errors),
      });

      const response = {
        success: false,
        rowsImported: 0,
        errors,
      };
      return validateResponse(response, apiSchemas.OnboardingImportResponseSchema);
    }

    // Create users using Better Auth (or direct DB insert with emailVerified=false)
    const importedUsers: string[] = [];

    for (const row of rows) {
      try {
        // Direct DB insert for pre-created users
        // Assign to the same workspace as the admin importing them
        const [newUser] = await db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            email: row.email,
            name: row.name,
            emailVerified: false, // Mark as pre-created for user linking
            roleType: row.roleType || null,
            nextReviewDate: row.nextReviewDate || null,
            role: "user", // All imports default to 'user'
            workspaceId, // Assign to admin's workspace
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        importedUsers.push(newUser.id);
      } catch (error) {
        console.error(`Failed to import user ${row.email}:`, error);
        errors.push({
          row: rows.indexOf(row) + 2,
          field: "import",
          message: `Failed to create user: ${error}`,
        });
      }
    }

    // Update buddy assignments after all users are created
    for (const row of rows) {
      if (row.buddyEmail) {
        try {
          const buddy = await db
            .select()
            .from(users)
            .where(and(eq(users.email, row.buddyEmail), eq(users.workspaceId, workspaceId)))
            .limit(1);

          if (buddy.length > 0) {
            await db
              .update(users)
              .set({ buddyId: buddy[0].id })
              .where(eq(users.email, row.email));
          } else {
            errors.push({
              row: rows.indexOf(row) + 2,
              field: "buddyEmail",
              message: `Buddy not found: ${row.buddyEmail}`,
            });
          }
        } catch (error) {
          console.error(`Failed to assign buddy for ${row.email}:`, error);
        }
      }
    }

    // Log successful import
    await db.insert(onboardingImports).values({
      adminId,
      filename: filename || "unknown.csv",
      rowsImported: importedUsers.length,
      status: "completed",
      errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
    });

    const response = {
      success: true,
      rowsImported: importedUsers.length,
      errors: errors.length > 0 ? errors : [],
    };
    return validateResponse(response, apiSchemas.OnboardingImportResponseSchema);
  } catch (error) {
    console.error("CSV import error:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to import CSV",
    });
  }
});
