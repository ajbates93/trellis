import "dotenv/config";
import { db, client } from "./connection";
import { users, reviewSchedules } from "./schema";
import { eq, and } from "drizzle-orm";

async function seedReflections() {
  console.log("🪞 Seeding review reflections for Alex Bates...\n");

  // Find Alex Bates
  const [alex] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, "alex.bates@pocketworks.co.uk"))
    .limit(1);

  if (!alex) {
    console.error("❌ Alex Bates not found in database");
    await client.end();
    return;
  }

  // Find buddy (Matteo)
  const [matteo] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, "matteo@pocketworks.co.uk"))
    .limit(1);

  if (!matteo) {
    console.error("❌ Matteo not found in database");
    await client.end();
    return;
  }

  console.log(`   Found ${alex.name} (${alex.id})`);
  console.log(`   Buddy: ${matteo.name} (${matteo.id})\n`);

  // Update existing October 2025 review with reflections
  const updated = await db
    .update(reviewSchedules)
    .set({
      reflectionLearnings: `<p>This quarter I learnt a lot about <strong>system design at scale</strong>. Working on the new microservices architecture forced me to think about service boundaries, event-driven communication, and eventual consistency in ways I hadn't before.</p><p>Key takeaways:</p><ul><li>Breaking down a monolith is as much a people problem as a technical one — team boundaries matter</li><li>GraphQL federation is powerful but adds operational complexity</li><li>Writing ADRs early saves painful debates later</li></ul>`,
      reflectionHighlights: `<p>Shipped the <strong>real-time notifications system</strong> ahead of schedule! The team rallied together and we delivered a polished feature that users have been asking for since Q1.</p><p>Also proud of:</p><ul><li>Mentored two junior devs through their first production deployments</li><li>Gave a lightning talk at the company all-hands on TypeScript migration patterns</li><li>Hit a personal best on the team's code review turnaround time (avg &lt;4 hours)</li></ul>`,
      reflectionConcerns: `<p>I'm a bit worried about <strong>burnout</strong>. The last few weeks of the quarter were intense and I noticed I was working late more often than I'd like. Need to set better boundaries.</p><p>Also concerned about:</p><ul><li>Our test coverage on the payments service is still below 60% — feels risky</li><li>Not sure I'm giving enough time to my buddees — want to be a better mentor</li></ul>`,
    })
    .where(
      and(
        eq(reviewSchedules.userId, alex.id),
        eq(reviewSchedules.name, "October 2025")
      )
    );

  console.log("   ✅ Updated October 2025 review with reflections");

  // Insert additional completed reviews with reflections
  const additionalReviews = [
    {
      userId: alex.id,
      buddyId: matteo.id,
      scheduledDate: new Date("2025-07-15").toISOString(),
      completedDate: new Date("2025-07-18").toISOString(),
      status: "completed",
      name: "July 2025",
      notes: "Mid-year review — focus on H1 progress and H2 planning",
      completionNotes: "Solid first half. Good balance of delivery and personal growth. Keep pushing on the mentoring side.",
      reflectionLearnings: `<p>The biggest learning this quarter was around <strong>stakeholder management</strong>. I used to think shipping good code was enough, but I've realised that communicating progress and trade-offs to non-technical stakeholders is equally important.</p><p>I also got much more comfortable with:</p><ul><li>Running retrospectives — tried a few new formats that got better engagement</li><li>Estimating work more accurately by breaking things down further</li><li>Using observability tools (Datadog) to debug production issues faster</li></ul>`,
      reflectionHighlights: `<p>Two big highlights this quarter:</p><ol><li><strong>Led the database migration project</strong> from Postgres 14 to 16 with zero downtime. This was my first time owning an infrastructure project end-to-end and it went smoothly.</li><li><strong>Started a weekly "Dev Lunch & Learn"</strong> series — we've had 8 sessions so far and attendance keeps growing. Topics have ranged from Rust basics to accessibility testing.</li></ol><p>On a personal note, I finally got my AWS Solutions Architect certification!</p>`,
      reflectionConcerns: `<p>Honestly, not many concerns this quarter — things feel like they're in a good groove. The one thing I'd flag is that our <strong>dependency upgrade cadence</strong> has slipped. We're 3 major versions behind on a couple of key libraries and it's going to be painful if we don't address it soon.</p>`,
    },
    {
      userId: alex.id,
      buddyId: matteo.id,
      scheduledDate: new Date("2025-04-10").toISOString(),
      completedDate: new Date("2025-04-12").toISOString(),
      status: "completed",
      name: "April 2025",
      notes: "Q1 review",
      completionNotes: "Strong quarter for technical growth. Communication skills improving steadily.",
      reflectionLearnings: `<p>This was a <strong>steep learning curve quarter</strong>. I picked up Vue 3 and Nuxt for the Trellis project and went from zero to productive pretty quickly. The composition API is a big mindset shift from what I was used to.</p><p>Other learnings:</p><ul><li>TDD really does make refactoring less scary — I'm a convert now</li><li>Pair programming with designers helped me understand spacing/layout decisions better</li><li>Database indexing strategies — saw a 10x query improvement just by adding the right composite index</li></ul>`,
      reflectionHighlights: `<p>Getting the <strong>Trellis MVP shipped</strong> was the big one. Going from a blank repo to a working product with auth, feedback flows, and dashboards in a few weeks was really satisfying.</p><ul><li>The feedback from the team on the first demo was overwhelmingly positive</li><li>Wrote my first proper technical RFC and got it approved</li></ul>`,
      reflectionConcerns: `<p>A few things on my mind:</p><ul><li><strong>Imposter syndrome</strong> — being the most junior person leading a greenfield project is daunting sometimes. I second-guess architectural decisions more than I should.</li><li>I need to get better at saying no to scope creep. Every conversation seems to add "just one more thing" to the backlog.</li><li>Would like more structured feedback from senior engineers — the buddy system helps but I want more code-level mentorship</li></ul>`,
    },
    {
      userId: alex.id,
      buddyId: matteo.id,
      scheduledDate: new Date("2026-01-15").toISOString(),
      completedDate: new Date("2026-01-18").toISOString(),
      status: "completed",
      name: "January 2026",
      notes: "Q4 2025 review and 2026 planning",
      completionNotes: "Excellent year-end review. Strong growth trajectory. Ready for more leadership responsibility.",
      reflectionLearnings: `<p>Q4 was all about <strong>shipping with quality</strong>. I learnt that rushing features out the door creates more work downstream — we had two incidents that could have been avoided with better testing.</p><p>Technical learnings:</p><ul><li>Edge cases in timezone handling are genuinely hard — wrote a shared utility that the whole team now uses</li><li>Performance profiling with Chrome DevTools — found and fixed a memory leak in our chart components</li><li>Better understanding of OAuth flows and security implications</li></ul><p>Soft skills:</p><ul><li>Learnt to give more constructive code review feedback — focusing on "why" not just "what"</li><li>Got more comfortable presenting to the wider business</li></ul>`,
      reflectionHighlights: `<p><strong>Promoted to mid-level developer!</strong> This was a big milestone for me and validation of the work I've been putting in all year.</p><p>Other highlights:</p><ul><li>Shipped the Slack integration for Trellis — users can now submit feedback without leaving Slack</li><li>Received the most peer feedback of anyone on the team for two consecutive quarters</li><li>Organised and ran the team's first hackathon — 3 of the 5 projects are now in our roadmap</li></ul>`,
      reflectionConcerns: null,
    },
  ];

  for (const review of additionalReviews) {
    try {
      await db.insert(reviewSchedules).values(review);
      console.log(`   ✅ Inserted ${review.name} review with reflections`);
    } catch (error: any) {
      console.log(`   ⚠️  ${review.name} may already exist: ${error.message?.slice(0, 80)}`);
    }
  }

  console.log("\n🎉 Done! Alex Bates now has 4 completed reviews with rich reflections.\n");
  await client.end();
}

seedReflections().catch(console.error);
