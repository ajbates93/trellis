import Papa from "papaparse";
import { db } from "#server/database/connection";
import { users, onboardingImports } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "#server/utils/auth";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";
import type { CSVRow } from "#server/types";

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

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

    // Parse CSV with papaparse (handles quoted fields, commas-in-values, CRLF)
    const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parsed.data.length === 0) {
      throw createError({
        statusCode: 400,
        message: "CSV must have at least a header row and one data row",
      });
    }

    // Validate header
    const headerFields = parsed.meta.fields ?? [];
    const requiredFields = ["email", "name"];

    for (const field of requiredFields) {
      if (!headerFields.includes(field)) {
        throw createError({
          statusCode: 400,
          message: `CSV missing required field: ${field}`,
        });
      }
    }

    // Parse data rows
    const rows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    parsed.data.forEach((raw, i) => {
      const rowNum = i + 2; // header is row 1
      const email = (raw.email ?? "").trim();
      const name = (raw.name ?? "").trim();
      const roleType = (raw.roletype ?? "").trim();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({
          row: rowNum,
          field: "email",
          message: `Invalid email format: ${email}`,
        });
        return;
      }

      // Validate name is not empty
      if (!name) {
        errors.push({
          row: rowNum,
          field: "name",
          message: "Name cannot be empty",
        });
        return;
      }

      // Validate roleType if provided
      if (roleType && !["dev", "design", "qa", "growth", "management"].includes(roleType)) {
        errors.push({
          row: rowNum,
          field: "roleType",
          message: `Invalid role type: ${roleType}. Must be dev, design, qa, growth, or management`,
        });
        return;
      }

      rows.push({
        email,
        name,
        roleType: roleType || undefined,
        buddyEmail: (raw.buddyemail ?? "").trim() || undefined,
        nextReviewDate: (raw.nextreviewdate ?? "").trim() || undefined,
      });
    });

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
      const row = rows[i]!;
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
    const createdUsers: Array<{ id: string; name: string; email: string }> = [];

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

        if (!newUser) {
          throw new Error("User insert returned no row");
        }

        importedUsers.push(newUser.id);
        createdUsers.push({ id: newUser.id, name: newUser.name, email: newUser.email });
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

          const buddyUser = buddy[0];
          if (buddyUser) {
            await db
              .update(users)
              .set({ buddyId: buddyUser.id })
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
      createdUsers,
    };
    return validateResponse(response, apiSchemas.OnboardingImportResponseSchema);
  } catch (error: any) {
    console.error("CSV import error:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to import CSV",
    });
  }
});
