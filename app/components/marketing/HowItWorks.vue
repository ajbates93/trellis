<script setup lang="ts">
const steps = [
  {
    title: "Set up your workspace.",
    body: "Add your team by CSV import or create users manually. Configure roles and buddy pairs, and your dashboard is ready in minutes.",
  },
  {
    title: "Your team signs in.",
    body: "OAuth (Google and more) or simple email and password - whatever suits your team. Everyone lands on their personalised dashboard.",
  },
  {
    title: "Feedback becomes a habit.",
    body: "Weekly reminders and gentle nudges turn feedback into a 90-second ritual. Prefer Slack? A /submit command lets people give feedback without leaving the chat.",
  },
];
</script>

<template>
  <section id="how-it-works" class="border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6 py-24">
      <div class="text-center">
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          How it works
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          Up and running in a week.
        </h2>
      </div>

      <div class="mt-14 grid md:grid-cols-3 gap-6">
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="bg-white/[0.02] border border-white/10 rounded-xl p-8"
        >
          <div
            class="size-10 rounded-lg bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold"
          >
            {{ i + 1 }}
          </div>
          <h3 class="mt-5 text-lg font-semibold">{{ step.title }}</h3>
          <p class="mt-2 text-white/60 text-sm leading-relaxed">{{ step.body }}</p>
        </div>
      </div>

      <p class="mt-10 text-center text-sm text-white/40">
        Most teams see their first round of feedback within 48 hours of onboarding.
      </p>
    </div>
  </section>
</template>
