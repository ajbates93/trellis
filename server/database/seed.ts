import "dotenv/config";
import { db, client } from "./connection";
import { users, feedbackPrompts } from "./schema";
import { eq } from "drizzle-orm";

// Team members data
const TEAM_MEMBERS = [
  { name: "Alex Britten", email: "alex.britten@pocketworks.co.uk", roleType: "qa" },
  { name: "Alex Bates", email: "alex.bates@pocketworks.co.uk", roleType: "dev" },
  { name: "Mark", email: "mark.houghton@pocketworks.co.uk", roleType: "dev" },
  { name: "Rory", email: "rory@pocketworks.co.uk", roleType: "dev" },
  { name: "Anna", email: "anna@pocketworks.co.uk", roleType: "design" },
  { name: "Matteo", email: "matteo@pocketworks.co.uk", roleType: "dev" },
  { name: "Judit", email: "judit@pocketworks.co.uk", roleType: "design" },
  { name: "Lucy", email: "lucy@pocketworks.co.uk", roleType: "growth" },
  { name: "Josh", email: "josh@pocketworks.co.uk", roleType: "dev" },
  { name: "Marcin", email: "marcin@pocketworks.co.uk", roleType: "dev" },
  { name: "Matej", email: "matej@pocketworks.co.uk", roleType: "dev" },
  { name: "Matt Chambers", email: "matt.chambers@pocketworks.co.uk", roleType: "qa" },
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
            roleType: member.roleType,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            // First user becomes admin
            role: member.email === "alex.bates@pocketworks.co.uk" ? "admin" : "user",
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

      // Feedback content templates organized by theme with varied sentiments
      // Each theme has positive, constructive, and mixed feedback
      const feedbackTemplates = {
        communication: [
          // Positive
          "Great job communicating complex technical concepts in team meetings. Very clear and easy to understand.",
          "Really appreciate the regular updates on project progress. Helps everyone stay aligned.",
          "Excellent at actively listening and incorporating feedback from others.",
          "The documentation you wrote for the new feature was exceptionally clear and helpful.",
          "Your presentation to stakeholders was outstanding - clear, confident, and well-structured.",
          "Really good at explaining technical decisions to non-technical team members.",
          // Constructive
          "Could improve on sharing blockers earlier - would help the team provide support sooner.",
          "Sometimes team updates get a bit too detailed. Focus on high-level summaries first would be helpful.",
          "Would benefit from more frequent check-ins during complex tasks to keep everyone informed.",
          "Consider being more concise in written communication - key points sometimes get lost.",
          "Documentation is thorough but could use more examples for clarity.",
        ],
        technical: [
          // Positive
          "Your code quality has been consistently excellent. Clean, well-tested, and maintainable.",
          "Great problem-solving skills when debugging that tricky production issue last week.",
          "The refactoring work you did really improved the codebase architecture.",
          "Really impressed with how quickly you picked up the new framework.",
          "Exceptional technical skills - always finds elegant solutions to complex problems.",
          "Your understanding of system architecture is really strong and valuable to the team.",
          // Constructive
          "Could benefit from more comprehensive error handling in edge cases.",
          "Test coverage has been slipping lately. Would be good to prioritize writing tests alongside features.",
          "Some recent code needs better comments explaining the reasoning behind complex logic.",
          "Consider breaking down larger functions into smaller, more testable units.",
          "Would benefit from more peer review before pushing to main - caught a few issues recently.",
        ],
        collaboration: [
          // Positive
          "Always willing to help teammates when they're stuck. Great team player!",
          "Your code reviews are thorough and educational. I learn something new each time.",
          "Excellent at pairing with junior developers and helping them level up.",
          "Really appreciate how you share knowledge and resources with the team.",
          "Creates a positive and supportive atmosphere in team meetings.",
          "Great at building consensus when the team has different opinions.",
          // Constructive
          "Would love to see you participate more actively in team discussions and brainstorming.",
          "Sometimes come across as dismissive of others' ideas. A bit more openness would help team dynamics.",
          "Could be more responsive to Slack messages, especially when teammates are blocked.",
          "Team members sometimes feel hesitant to ask you questions. Being more approachable would help.",
          "Would benefit from actively seeking input from others rather than working in isolation.",
        ],
        initiative: [
          // Positive
          "Love that you proactively identified and fixed that performance bottleneck.",
          "Great initiative in proposing and implementing the automated testing improvements.",
          "Really impressed by how you took the lead on the sprint planning improvements.",
          "Your proactive approach to learning new technologies is inspiring.",
          "Consistently spots opportunities for improvement and follows through on them.",
          "Takes ownership of problems and drives them to completion without needing oversight.",
          // Constructive
          "Would be great to see you take ownership of larger feature implementations.",
          "Sometimes waits for explicit direction when could take more initiative.",
          "Could benefit from being more proactive in flagging potential issues before they become problems.",
          "Would love to see you propose solutions more often rather than just identifying problems.",
        ],
        quality: [
          // Positive
          "Your attention to detail in QA has prevented several bugs from reaching production.",
          "The test coverage you maintain is excellent and gives everyone confidence.",
          "Really appreciate the thoroughness of your code reviews.",
          "Your work consistently meets high quality standards.",
          "Never cuts corners - always delivers polished, production-ready work.",
          // Constructive
          "Could be helpful to add more integration tests alongside the unit tests.",
          "Recent work has had a few edge case bugs slip through. Consider more thorough testing.",
          "Balance between speed and quality needs attention - some recent features were rushed.",
          "Code quality has been inconsistent lately. Take time to review your own work before submitting.",
        ],
        clientRelations: [
          // Positive
          "Excellent at managing client expectations and keeping them informed.",
          "Really good at understanding client needs and translating them into technical requirements.",
          "Clients consistently give positive feedback about your professionalism.",
          // Constructive
          "Could improve response time to client emails - aim for same-day acknowledgment.",
          "Sometimes technical jargon in client calls confuses them. Simplify explanations.",
          "Client feedback suggests they'd appreciate more frequent project updates.",
        ],
        timeManagement: [
          // Positive
          "Consistently delivers work on time and manages commitments well.",
          "Great at breaking down complex tasks and estimating time accurately.",
          "Really reliable with deadlines - the team can always count on you.",
          // Constructive
          "Several deadlines have been missed recently. Consider more realistic time estimates.",
          "Would benefit from better prioritization - sometimes focus on less critical tasks first.",
          "Tends to take on too much at once. Learning to say no would help quality.",
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
          const reviewerId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
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

      // Add guaranteed published feedback FOR Alex Bates (for testing sentiment analysis)
      // 25+ diverse feedback items with varied sentiments across multiple themes
      const guaranteedFeedbackForAlex = [
        // Communication - Positive
        {
          reviewerId: roryId,
          revieweeId: alexBatesId,
          content: "Great job communicating complex technical concepts in team meetings. Very clear and easy to understand.",
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
          content: "Really appreciate the regular updates on project progress. Helps everyone stay aligned.",
          published: true,
          publishedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 6 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: annaId,
          revieweeId: alexBatesId,
          content: "The documentation you wrote for the new feature was exceptionally clear and helpful.",
          published: true,
          publishedAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
          publishedBy: markId,
          weekYear: getWeekYear(new Date(now - 9 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000),
        },
        // Communication - Constructive
        {
          reviewerId: matteoId,
          revieweeId: alexBatesId,
          content: "Could improve on sharing blockers earlier - would help the team provide support sooner.",
          published: true,
          publishedAt: new Date(now - 11 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 12 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: markId,
          revieweeId: alexBatesId,
          content: "Documentation is thorough but could use more examples for clarity.",
          published: true,
          publishedAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 16 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 16 * 24 * 60 * 60 * 1000),
        },
        // Technical - Positive
        {
          reviewerId: marcinId,
          revieweeId: alexBatesId,
          content: "Your code quality has been consistently excellent. Clean, well-tested, and maintainable.",
          published: true,
          publishedAt: new Date(now - 18 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 19 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 19 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: matejId,
          revieweeId: alexBatesId,
          content: "Really impressed with how quickly you picked up the new framework. Exceptional technical skills.",
          published: true,
          publishedAt: new Date(now - 22 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 23 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 23 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: joshId,
          revieweeId: alexBatesId,
          content: "The refactoring work you did really improved the codebase architecture. Great problem-solving skills.",
          published: true,
          publishedAt: new Date(now - 25 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 26 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 26 * 24 * 60 * 60 * 1000),
        },
        // Technical - Constructive
        {
          reviewerId: alexBrittenId,
          revieweeId: alexBatesId,
          content: "Test coverage has been slipping lately. Would be good to prioritize writing tests alongside features.",
          published: true,
          publishedAt: new Date(now - 28 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 29 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 29 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: mattChambersId,
          revieweeId: alexBatesId,
          content: "Some recent code needs better comments explaining the reasoning behind complex logic.",
          published: true,
          publishedAt: new Date(now - 32 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 33 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 33 * 24 * 60 * 60 * 1000),
        },
        // Collaboration - Positive
        {
          reviewerId: lucyId,
          revieweeId: alexBatesId,
          content: "Always willing to help teammates when they're stuck. Great team player!",
          published: true,
          publishedAt: new Date(now - 35 * 24 * 60 * 60 * 1000),
          publishedBy: annaId,
          weekYear: getWeekYear(new Date(now - 36 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 36 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: roryId,
          revieweeId: alexBatesId,
          content: "Your code reviews are thorough and educational. I learn something new each time.",
          published: true,
          publishedAt: new Date(now - 38 * 24 * 60 * 60 * 1000),
          publishedBy: markId,
          weekYear: getWeekYear(new Date(now - 39 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 39 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: matteoId,
          revieweeId: alexBatesId,
          content: "Excellent at pairing with junior developers and helping them level up. Really appreciate how you share knowledge.",
          published: true,
          publishedAt: new Date(now - 42 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 43 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 43 * 24 * 60 * 60 * 1000),
        },
        // Collaboration - Constructive
        {
          reviewerId: annaId,
          revieweeId: alexBatesId,
          content: "Could be more responsive to Slack messages, especially when teammates are blocked.",
          published: true,
          publishedAt: new Date(now - 45 * 24 * 60 * 60 * 1000),
          publishedBy: markId,
          weekYear: getWeekYear(new Date(now - 46 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 46 * 24 * 60 * 60 * 1000),
        },
        // Client Relations - Positive
        {
          reviewerId: juditId,
          revieweeId: alexBatesId,
          content: "Excellent at managing client expectations and keeping them informed. Really professional.",
          published: true,
          publishedAt: new Date(now - 48 * 24 * 60 * 60 * 1000),
          publishedBy: annaId,
          weekYear: getWeekYear(new Date(now - 49 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 49 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: lucyId,
          revieweeId: alexBatesId,
          content: "Really good at understanding client needs and translating them into technical requirements.",
          published: true,
          publishedAt: new Date(now - 52 * 24 * 60 * 60 * 1000),
          publishedBy: annaId,
          weekYear: getWeekYear(new Date(now - 53 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 53 * 24 * 60 * 60 * 1000),
        },
        // Client Relations - Constructive
        {
          reviewerId: markId,
          revieweeId: alexBatesId,
          content: "Client feedback suggests they'd appreciate more frequent project updates from you.",
          published: true,
          publishedAt: new Date(now - 56 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 57 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 57 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: roryId,
          revieweeId: alexBatesId,
          content: "Sometimes technical jargon in client calls confuses them. Simplify explanations when possible.",
          published: true,
          publishedAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
          publishedBy: markId,
          weekYear: getWeekYear(new Date(now - 61 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 61 * 24 * 60 * 60 * 1000),
        },
        // Time Management - Positive
        {
          reviewerId: matteoId,
          revieweeId: alexBatesId,
          content: "Consistently delivers work on time and manages commitments well. Very reliable.",
          published: true,
          publishedAt: new Date(now - 64 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 65 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 65 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: joshId,
          revieweeId: alexBatesId,
          content: "Great at breaking down complex tasks and estimating time accurately. Really helps with planning.",
          published: true,
          publishedAt: new Date(now - 68 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 69 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 69 * 24 * 60 * 60 * 1000),
        },
        // Initiative - Positive
        {
          reviewerId: marcinId,
          revieweeId: alexBatesId,
          content: "Love that you proactively identified and fixed that performance bottleneck. Took great initiative.",
          published: true,
          publishedAt: new Date(now - 72 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 73 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 73 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: matejId,
          revieweeId: alexBatesId,
          content: "Really impressed by how you took the lead on the sprint planning improvements. Great ownership.",
          published: true,
          publishedAt: new Date(now - 76 * 24 * 60 * 60 * 1000),
          publishedBy: matteoId,
          weekYear: getWeekYear(new Date(now - 77 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 77 * 24 * 60 * 60 * 1000),
        },
        // Quality - Positive
        {
          reviewerId: alexBrittenId,
          revieweeId: alexBatesId,
          content: "Your attention to detail has prevented several bugs from reaching production. Really appreciate the thoroughness.",
          published: true,
          publishedAt: new Date(now - 80 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 81 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 81 * 24 * 60 * 60 * 1000),
        },
        {
          reviewerId: mattChambersId,
          revieweeId: alexBatesId,
          content: "Your work consistently meets high quality standards. Never cuts corners - always delivers polished, production-ready work.",
          published: true,
          publishedAt: new Date(now - 84 * 24 * 60 * 60 * 1000),
          publishedBy: roryId,
          weekYear: getWeekYear(new Date(now - 85 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 85 * 24 * 60 * 60 * 1000),
        },
        // Mixed feedback
        {
          reviewerId: annaId,
          revieweeId: alexBatesId,
          content: "Alex's technical skills are excellent, but sometimes I feel he could be more open to alternative approaches in discussions.",
          published: true,
          publishedAt: new Date(now - 88 * 24 * 60 * 60 * 1000),
          publishedBy: markId,
          weekYear: getWeekYear(new Date(now - 89 * 24 * 60 * 60 * 1000)),
          isRead: true,
          createdAt: new Date(now - 89 * 24 * 60 * 60 * 1000),
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

    // Step 5: Create review schedules
    console.log("\n📅 Creating review schedules...");

    const { reviewSchedules: reviewSchedulesTable } = await import("./schema");

    // Create review schedules for users with buddies
    const reviewScheduleData = [
      // Alex Bates (buddy: Matteo) - upcoming and past
      {
        userId: alexBatesId,
        buddyId: matteoId,
        scheduledDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
        status: "scheduled",
        name: "January 2026",
        notes: "Focus on technical growth and team collaboration",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: alexBatesId,
        buddyId: matteoId,
        scheduledDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
        status: "completed",
        name: "October 2025",
        notes: "Q4 review - focus on leadership development",
        completedDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
        completionNotes: "Great progress on public speaking and mentorship. Continue developing these skills.",
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
      },
      // Matteo (buddy: Mark) - upcoming
      {
        userId: matteoId,
        buddyId: markId,
        scheduledDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "scheduled",
        name: "February 2026",
        notes: "Review of Q1 goals and project deliveries",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: matteoId,
        buddyId: markId,
        scheduledDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "completed",
        name: "November 2025",
        completedDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
        completionNotes: "Strong technical execution. Focus on communication with stakeholders next quarter.",
        createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
      },
      // Marcin (buddy: Alex Bates) - upcoming
      {
        userId: marcinId,
        buddyId: alexBatesId,
        scheduledDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "scheduled",
        name: "February 2026",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Matej (buddy: Alex Bates) - upcoming
      {
        userId: matejId,
        buddyId: alexBatesId,
        scheduledDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "scheduled",
        name: "January 2026",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Rory (buddy: Anna) - past
      {
        userId: roryId,
        buddyId: annaId,
        scheduledDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "completed",
        name: "December 2025",
        completedDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        completionNotes: "Excellent quarter. Keep up the client communication improvements.",
        createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const review of reviewScheduleData) {
      try {
        await db.insert(reviewSchedulesTable).values(review);
        const userName = Object.keys(userIdMap).find((k) => userIdMap[k] === review.userId);
        const buddyName = Object.keys(userIdMap).find((k) => userIdMap[k] === review.buddyId);
        const statusEmoji = review.status === "scheduled" ? "📅" : "✅";
        console.log(`   ${statusEmoji} ${userName} ↔ ${buddyName}: ${review.name} (${review.status})`);
      } catch (error) {
        console.log(`   ⚠️  Review schedule may already exist, skipping...`);
      }
    }

    // Step 6: Create sample goals for testing
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
    console.log(`   - Review schedules: 7 created (4 upcoming, 3 completed)`);
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
