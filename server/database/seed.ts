import "dotenv/config";
import { db, client } from "./connection";
import { users, feedbackPrompts } from "./schema";
import { eq } from "drizzle-orm";

// Team members data
const TEAM_MEMBERS = [
  { name: "Alex Britten", email: "alex.britten@pocketworks.co.uk" },
  { name: "Alex Bates", email: "alex.bates@pocketworks.co.uk" },
  { name: "Mark", email: "mark.houghton@pocketworks.co.uk" },
  { name: "Rory", email: "rory@pocketworks.co.uk" },
  { name: "Anna", email: "anna@pocketworks.co.uk" },
  { name: "Matteo", email: "matteo@pocketworks.co.uk" },
  { name: "Judit", email: "judit@pocketworks.co.uk" },
  { name: "Lucy", email: "lucy@pocketworks.co.uk" },
  { name: "Josh", email: "josh@pocketworks.co.uk" },
  { name: "Marcin", email: "marcin@pocketworks.co.uk" },
  { name: "Matej", email: "matej@pocketworks.co.uk" },
  { name: "Matt Chambers", email: "matt.chambers@pocketworks.co.uk" },
];

// Buddy assignments - who receives feedback about whom
// Format: "Person being reviewed": "Person who receives the feedback (buddy)"
const BUDDY_ASSIGNMENTS: Record<string, string> = {
  // Anna receives feedback about:
  Rory: "Anna",
  Judit: "Anna",
  Lucy: "Anna",

  // Rory receives feedback about:
  "Alex Britten": "Rory",
  Mark: "Rory",

  // Mark receives feedback about:
  Anna: "Mark",
  Matteo: "Mark",

  // Matteo receives feedback about:
  Josh: "Matteo",
  "Alex Bates": "Matteo",

  // Alex Bates receives feedback about:
  Marcin: "Alex Bates",
  Matej: "Alex Bates",

  // Alex Britten receives feedback about:
  "Matt Chambers": "Alex Britten",
};

// Feedback questions
const QUESTIONS = [
  {
    question: "How effectively does this person share information with the team?",
    category: "communication",
  },
  {
    question: "What could help this person communicate their ideas even better?",
    category: "communication",
  },
  {
    question:
      "How well does this person listen to and consider others' perspectives?",
    category: "communication",
  },
  {
    question: "What would make collaborating with this person even more effective?",
    category: "collaboration",
  },
  {
    question: "What unique value does this person bring to the team?",
    category: "teamwork",
  },
  {
    question:
      "What's one skill this person has developed noticeably in recent months?",
    category: "growth",
  },
  {
    question: "What's one area where this person could focus their learning next?",
    category: "growth",
  },
  {
    question: "How does this person handle new challenges or unfamiliar tasks?",
    category: "problem-solving",
  },
  {
    question:
      "What type of projects or responsibilities would help this person grow?",
    category: "growth",
  },
  {
    question: "How does this person contribute to team meetings and discussions?",
    category: "collaboration",
  },
  {
    question: "What does this person do that makes the team work better together?",
    category: "teamwork",
  },
  {
    question: "How could the team better support this person's success?",
    category: "teamwork",
  },
  {
    question:
      "What would you like to see more of from this person in team settings?",
    category: "teamwork",
  },
  {
    question: "How do you find the way this person approach problems when they arise?",
    category: "problem-solving",
  },
  {
    question: "What's an example of when this person showed great initiative?",
    category: "initiative",
  },
  {
    question: "How could this person's decision-making process be even stronger?",
    category: "problem-solving",
  },
  {
    question: "What prevents this person from being even more effective in their role?",
    category: "general",
  },
  {
    question:
      "What's something this person does really well that others might not notice?",
    category: "general",
  },
  {
    question: "How has this person's work made your job easier or better?",
    category: "general",
  },
  {
    question:
      "Is there anything this person does that you feel could be done differently?",
    category: "general",
  },
  {
    question: "What's one thing this person should definitely keep doing?",
    category: "general",
  },
];

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Step 1: Create all users first (without buddy relationships)
    console.log("\n📝 Creating users...");

    const userIdMap: Record<string, string> = {};

    for (const member of TEAM_MEMBERS) {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, member.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`   ✓ User ${member.name} already exists`);
        userIdMap[member.name] = existingUser[0].id;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            email: member.email,
            name: member.name,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            // First user becomes admin
            isAdmin: member.email === "alex.bates@pocketworks.co.uk",
          })
          .returning();

        userIdMap[member.name] = newUser.id;
        console.log(`   ✓ Created user: ${member.name}`);
      }
    }

    // Step 2: Update buddy relationships
    console.log("\n🤝 Setting up buddy relationships...");

    for (const [personName, buddyName] of Object.entries(BUDDY_ASSIGNMENTS)) {
      const personId = userIdMap[personName];
      const buddyId = userIdMap[buddyName];

      if (!personId || !buddyId) {
        console.log(
          `   ⚠️  Skipping buddy assignment: ${personName} -> ${buddyName} (user not found)`
        );
        continue;
      }

      await db.update(users).set({ buddyId }).where(eq(users.id, personId));

      console.log(`   ✓ ${personName} -> buddy: ${buddyName}`);
    }

    // Step 3: Create feedback questions
    console.log("\n❓ Creating feedback prompts...");

    for (const prompt of QUESTIONS) {
      // Check if question already exists
      const existingPrompt = await db
        .select()
        .from(feedbackPrompts)
        .where(eq(feedbackPrompts.question, prompt.question))
        .limit(1);

      if (existingPrompt.length > 0) {
        console.log(`   ✓ Question already exists: ${prompt.question.substring(0, 50)}...`);
      } else {
        await db.insert(feedbackPrompts).values(prompt);
        console.log(`   ✓ Created question: ${prompt.question.substring(0, 50)}...`);
      }
    }

    // Step 4: Create sample feedback for testing (60-80 items across 12 weeks)
    console.log("\n💬 Creating sample feedback...");

    const alexBatesId = userIdMap["Alex Bates"];
    const marcinId = userIdMap["Marcin"];
    const matejId = userIdMap["Matej"];
    const roryId = userIdMap["Rory"];
    const juditId = userIdMap["Judit"];
    const lucyId = userIdMap["Lucy"];
    const annaId = userIdMap["Anna"];
    const matteoId = userIdMap["Matteo"];
    const alexBrittenId = userIdMap["Alex Britten"];
    const markId = userIdMap["Mark"];
    const joshId = userIdMap["Josh"];
    const mattChambersId = userIdMap["Matt Chambers"];

    if (!alexBatesId || !marcinId || !matejId) {
      console.log("   ⚠️  Skipping feedback creation - required users not found");
    } else {
      const { feedback: feedbackTable } = await import("./schema");

      // Helper function to calculate week number in ISO format
      const getWeekYear = (date: Date): string => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      };

      // Helper to get random items from array
      const getRandomItems = <T,>(arr: T[], count: number): T[] => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      };

      // Feedback content templates organized by theme
      const feedbackTemplates = {
        communication: [
          "Great job communicating complex technical concepts in team meetings. Very clear and easy to understand.",
          "Really appreciate the regular updates on project progress. Helps everyone stay aligned.",
          "Could improve on sharing blockers earlier - would help the team provide support sooner.",
          "Excellent at actively listening and incorporating feedback from others.",
          "The documentation you wrote for the new feature was exceptionally clear and helpful.",
        ],
        technical: [
          "Your code quality has been consistently excellent. Clean, well-tested, and maintainable.",
          "Great problem-solving skills when debugging that tricky production issue last week.",
          "The refactoring work you did really improved the codebase architecture.",
          "Could benefit from more comprehensive error handling in edge cases.",
          "Really impressed with how quickly you picked up the new framework.",
        ],
        collaboration: [
          "Always willing to help teammates when they're stuck. Great team player!",
          "Your code reviews are thorough and educational. I learn something new each time.",
          "Would love to see you participate more actively in team discussions and brainstorming.",
          "Excellent at pairing with junior developers and helping them level up.",
          "Really appreciate how you share knowledge and resources with the team.",
        ],
        initiative: [
          "Love that you proactively identified and fixed that performance bottleneck.",
          "Great initiative in proposing and implementing the automated testing improvements.",
          "Would be great to see you take ownership of larger feature implementations.",
          "Really impressed by how you took the lead on the sprint planning improvements.",
          "Your proactive approach to learning new technologies is inspiring.",
        ],
        quality: [
          "Your attention to detail in QA has prevented several bugs from reaching production.",
          "The test coverage you maintain is excellent and gives everyone confidence.",
          "Could be helpful to add more integration tests alongside the unit tests.",
          "Really appreciate the thoroughness of your code reviews.",
          "Your work consistently meets high quality standards.",
        ],
      };

      // All user IDs for generating diverse feedback
      const allUserIds = [
        alexBatesId, marcinId, matejId, roryId, juditId, lucyId,
        annaId, matteoId, alexBrittenId, markId, joshId, mattChambersId
      ].filter(Boolean);

      // Generate feedback across 12 weeks with realistic distribution
      const sampleFeedback: any[] = [];
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;

      // Week distribution (target count per week)
      const weeklyDistribution = [
        4, 3, 5, 7, 8, 6, 9, 5, 6, 7, 8, 10  // Total: ~78 items
      ];

      for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
        const targetCount = weeklyDistribution[11 - weekOffset];
        const weekStart = now - (weekOffset * oneWeek);

        for (let i = 0; i < targetCount; i++) {
          // Random day within the week (0-6 days offset)
          const dayOffset = Math.floor(Math.random() * 7);
          const hourOffset = Math.floor(Math.random() * 24);
          const createdAt = new Date(weekStart + (dayOffset * 24 * 60 * 60 * 1000) + (hourOffset * 60 * 60 * 1000));
          const weekYear = getWeekYear(createdAt);

          // Random reviewer and reviewee (ensure they're different)
          let reviewerId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
          let revieweeId = allUserIds[Math.floor(Math.random() * allUserIds.length)];

          // Ensure reviewer and reviewee are different
          while (reviewerId === revieweeId) {
            revieweeId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
          }

          // Random theme and content
          const themes = Object.keys(feedbackTemplates) as Array<keyof typeof feedbackTemplates>;
          const theme = themes[Math.floor(Math.random() * themes.length)];
          const templates = feedbackTemplates[theme];
          const content = templates[Math.floor(Math.random() * templates.length)];

          // 70% published, 30% unpublished
          const isPublished = Math.random() < 0.7;

          // For published feedback, published 1-2 days after creation
          const publishedAt = isPublished
            ? new Date(createdAt.getTime() + (1 + Math.random()) * 24 * 60 * 60 * 1000)
            : undefined;

          // Random publisher (usually a buddy or admin)
          const publishedBy = isPublished
            ? [annaId, roryId, markId, matteoId, alexBatesId][Math.floor(Math.random() * 5)]
            : undefined;

          // Random read status (80% of published feedback is read)
          const isRead = isPublished ? Math.random() < 0.8 : false;

          sampleFeedback.push({
            reviewerId,
            revieweeId,
            content,
            createdAt,
            weekYear,
            published: isPublished,
            publishedAt,
            publishedBy,
            isRead,
          });
        }
      }

      // Add guaranteed published feedback FOR Alex Bates (for testing Recent Feedback section)
      const guaranteedFeedbackForAlex = [
        {
          reviewerId: roryId,
          revieweeId: alexBatesId,
          content: "Alex has been doing an excellent job with code reviews. His feedback is always constructive and helps improve code quality.",
          published: true,
          publishedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 3 * 24 * 60 * 60 * 1000)),
          isRead: false,
          createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: juditId,
          revieweeId: alexBatesId,
          content: "Really appreciate Alex's technical leadership on the project. He's great at explaining complex concepts to the team.",
          published: true,
          publishedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 5 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: annaId,
          revieweeId: alexBatesId,
          content: "Alex's documentation for the new API has been incredibly helpful. Clear, concise, and well-organized.",
          published: true,
          publishedAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
          publishedBy: markId,
          weekYear: getWeekYear(new Date(now - 7 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: matteoId,
          revieweeId: alexBatesId,
          content: "Great collaboration on the sprint planning. Alex helps keep discussions focused and productive.",
          published: true,
          publishedAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
          publishedBy: annaId,
          weekYear: getWeekYear(new Date(now - 11 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 11 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: marcinId,
          revieweeId: alexBatesId,
          content: "Alex has been very supportive in helping me ramp up on the codebase. His pairing sessions are always valuable.",
          published: true,
          publishedAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 15 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
        },
      ];

      sampleFeedback.unshift(...guaranteedFeedbackForAlex);

      // Insert all generated feedback
      let insertedCount = 0;
      for (const fb of sampleFeedback) {
        try {
          await db.insert(feedbackTable).values(fb);
          const status = fb.published ? "✓" : "○";
          const reviewer = Object.keys(userIdMap).find(k => userIdMap[k] === fb.reviewerId) || "Unknown";
          const reviewee = Object.keys(userIdMap).find(k => userIdMap[k] === fb.revieweeId) || "Unknown";
          console.log(
            `   ${status} ${fb.weekYear} ${reviewer} → ${reviewee}: ${fb.content.substring(0, 35)}...`
          );
          insertedCount++;
        } catch (error) {
          // Silently skip duplicates
        }
      }
      console.log(`\n   📊 Inserted ${insertedCount} feedback items across 12 weeks (including ${guaranteedFeedbackForAlex.length} guaranteed for Alex Bates)`);
    }

    // Step 5: Create sample goals for testing
    console.log("\n🎯 Creating sample goals...");

    if (!alexBatesId || !marcinId) {
      console.log("   ⚠️  Skipping goals creation - required users not found");
    } else {
      const { goals: goalsTable } = await import("./schema");

      // Sample goals for Alex Bates
      const sampleGoals = [
        // Alex Bates - Active goals
        {
          userId: alexBatesId,
          goalText: "Improve my public speaking skills by presenting at the next team all-hands meeting",
          status: "active",
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          userId: alexBatesId,
          goalText: "Learn advanced TypeScript patterns and apply them to our codebase",
          status: "active",
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          userId: alexBatesId,
          goalText: "Mentor two junior developers and help them complete their onboarding projects",
          status: "active",
          targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        // Alex Bates - Completed goal
        {
          userId: alexBatesId,
          goalText: "Complete the AWS certification course",
          status: "completed",
          targetDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          userId: alexBatesId,
          goalText: "Reduce code review turnaround time to under 24 hours",
          status: "completed",
          targetDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        },
        // Alex Bates - Archived goal
        {
          userId: alexBatesId,
          goalText: "Migrate legacy authentication system to OAuth",
          status: "archived",
          targetDate: null,
          createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },

        // Marcin - Active goals
        {
          userId: marcinId,
          goalText: "Improve backend API performance by implementing caching strategies",
          status: "active",
          targetDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          userId: marcinId,
          goalText: "Write comprehensive API documentation for all endpoints",
          status: "active",
          targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        // Marcin - Completed goal
        {
          userId: marcinId,
          goalText: "Refactor database queries to use proper ORM patterns",
          status: "completed",
          targetDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ];

      // Insert goals
      for (const goal of sampleGoals) {
        try {
          await db.insert(goalsTable).values(goal);
          const userName = Object.keys(userIdMap).find((k) => userIdMap[k] === goal.userId);
          const statusEmoji = goal.status === "active" ? "🎯" : goal.status === "completed" ? "✅" : "📦";
          console.log(`   ${statusEmoji} ${userName}: ${goal.goalText.substring(0, 50)}...`);
        } catch (error) {
          console.log(`   ⚠️  Goal may already exist, skipping...`);
        }
      }
    }

    console.log("\n✅ Seed completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: ${Object.keys(userIdMap).length}`);
    console.log(`   - Buddy relationships: ${Object.keys(BUDDY_ASSIGNMENTS).length}`);
    console.log(`   - Feedback prompts: ${QUESTIONS.length}`);
    console.log(`   - Feedback items: ~78 items across 12 weeks (70% published)`);
    console.log(`   - Sample goals: Created for Alex Bates and Marcin`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run seed
seed();
