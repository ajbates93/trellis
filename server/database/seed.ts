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

    console.log("\n✅ Seed completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: ${Object.keys(userIdMap).length}`);
    console.log(`   - Buddy relationships: ${Object.keys(BUDDY_ASSIGNMENTS).length}`);
    console.log(`   - Feedback prompts: ${QUESTIONS.length}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run seed
seed();
