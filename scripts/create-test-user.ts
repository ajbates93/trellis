import { db } from "../server/database/connection";
import { users, feedback, goals, reviewSchedules, achievements } from "../server/database/schema";
import { eq } from "drizzle-orm";

async function createTestUser() {
  console.log("🔍 Finding Matteo...");

  // Find Matteo by email
  const [matteo] = await db
    .select()
    .from(users)
    .where(eq(users.email, "matteo@pocketworks.co.uk"))
    .limit(1);

  if (!matteo) {
    console.error("❌ Matteo not found with email matteo@pocketworks.co.uk");
    process.exit(1);
  }

  console.log(`✅ Found Matteo: ${matteo.name} (${matteo.id})`);

  // Create test user
  const testUserId = crypto.randomUUID();
  const testUserEmail = "test-user-delete-me@example.com";

  console.log("\n👤 Creating test user...");
  const [testUser] = await db
    .insert(users)
    .values({
      id: testUserId,
      email: testUserEmail,
      emailVerified: true,
      name: "Test User (DELETE ME)",
      role: "user",
      roleType: "dev",
      buddyId: matteo.id, // Assign Matteo as buddy
      nextReviewDate: "2025-12-20",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`✅ Created test user: ${testUser.name} (${testUser.id})`);
  console.log(`   Buddy: ${matteo.name}`);

  // Get another user to send feedback from
  const [anotherUser] = await db
    .select()
    .from(users)
    .where(eq(users.emailVerified, true))
    .limit(1);

  // Create feedback received by test user (2 items)
  console.log("\n📥 Creating feedback received by test user...");
  const receivedFeedback1 = await db
    .insert(feedback)
    .values({
      id: crypto.randomUUID(),
      reviewerId: matteo.id,
      revieweeId: testUserId,
      content: "Great work on the recent project! Your attention to detail is impressive.",
      published: true,
      publishedAt: new Date(),
      publishedBy: matteo.id,
      weekYear: "2025-W48",
      isRead: false,
      createdAt: new Date(),
    })
    .returning();

  const receivedFeedback2 = await db
    .insert(feedback)
    .values({
      id: crypto.randomUUID(),
      reviewerId: anotherUser.id,
      revieweeId: testUserId,
      content: "You've been really helpful with code reviews this week. Keep it up!",
      published: true,
      publishedAt: new Date(),
      publishedBy: anotherUser.id,
      weekYear: "2025-W48",
      isRead: true,
      createdAt: new Date(),
    })
    .returning();

  console.log(`✅ Created 2 feedback items received`);

  // Create feedback sent by test user (2 items)
  console.log("\n📤 Creating feedback sent by test user...");
  const sentFeedback1 = await db
    .insert(feedback)
    .values({
      id: crypto.randomUUID(),
      reviewerId: testUserId,
      revieweeId: matteo.id,
      content: "Thanks for all the guidance this week! Really appreciate your help.",
      published: false,
      weekYear: "2025-W48",
      createdAt: new Date(),
    })
    .returning();

  const sentFeedback2 = await db
    .insert(feedback)
    .values({
      id: crypto.randomUUID(),
      reviewerId: testUserId,
      revieweeId: anotherUser.id,
      content: "Great job on the presentation! Very clear and engaging.",
      published: true,
      publishedAt: new Date(),
      publishedBy: matteo.id,
      weekYear: "2025-W48",
      createdAt: new Date(),
    })
    .returning();

  console.log(`✅ Created 2 feedback items sent`);

  // Create past review
  console.log("\n📅 Creating past review...");
  const pastReview = await db
    .insert(reviewSchedules)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      buddyId: matteo.id,
      scheduledDate: "2025-11-15",
      completedDate: "2025-11-15",
      status: "completed",
      name: "November 2025 Review",
      notes: "Q4 performance review",
      completionNotes: "Great progress on technical skills. Keep focusing on communication.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`✅ Created past review: ${pastReview[0].name}`);

  // Create upcoming review
  console.log("\n📅 Creating upcoming review...");
  const upcomingReview = await db
    .insert(reviewSchedules)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      buddyId: matteo.id,
      scheduledDate: "2025-12-20",
      status: "scheduled",
      name: "December 2025 Review",
      notes: "End of year review",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`✅ Created upcoming review: ${upcomingReview[0].name}`);

  // Create goals
  console.log("\n🎯 Creating goals...");
  const goal1 = await db
    .insert(goals)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      goalText: "Learn TypeScript advanced patterns",
      description: "<p>Focus on generics, conditional types, and mapped types</p>",
      status: "active",
      targetDate: "2025-12-31",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const goal2 = await db
    .insert(goals)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      goalText: "Complete AWS certification",
      description: "<p>Prepare for AWS Solutions Architect exam</p>",
      status: "active",
      targetDate: "2026-01-31",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`✅ Created 2 goals`);

  // Create achievements
  console.log("\n🏆 Creating achievements...");
  const achievement1 = await db
    .insert(achievements)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      title: "Shipped major feature",
      description: "<p>Led development of new authentication system</p>",
      achievedDate: "2025-11-01",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const achievement2 = await db
    .insert(achievements)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      title: "Won hackathon",
      description: "<p>First place in company hackathon with AI project</p>",
      achievedDate: "2025-10-15",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const achievement3 = await db
    .insert(achievements)
    .values({
      id: crypto.randomUUID(),
      userId: testUserId,
      title: "Mentored junior developer",
      description: "<p>Successfully onboarded and mentored new team member</p>",
      achievedDate: "2025-09-20",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`✅ Created 3 achievements`);

  console.log("\n✅ Test user created successfully!");
  console.log("\n📊 Summary:");
  console.log(`   User: ${testUser.name} (${testUser.email})`);
  console.log(`   Buddy: ${matteo.name}`);
  console.log(`   Feedback received: 2 items`);
  console.log(`   Feedback sent: 2 items`);
  console.log(`   Past reviews: 1`);
  console.log(`   Upcoming reviews: 1`);
  console.log(`   Goals: 2`);
  console.log(`   Achievements: 3`);
  console.log("\n🗑️  You can now test the delete functionality in the admin panel!");
}

createTestUser()
  .catch((error) => {
    console.error("❌ Error creating test user:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
