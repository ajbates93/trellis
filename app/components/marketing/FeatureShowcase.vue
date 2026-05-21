<script setup lang="ts">
type TabKey = "submit" | "inbox" | "goals" | "reviews" | "insights";

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
  copy: string;
  image: string;
  alt: string;
}

const tabs: Tab[] = [
  {
    key: "submit",
    label: "Submit feedback",
    icon: "i-heroicons-paper-airplane",
    copy: "Give feedback in 90 seconds. Inspiration prompts, character minimums, and a clear 'who you're reviewing' header keep submissions specific and actionable.",
    image: "/marketing/feature-submit.webp",
    alt: "Submit feedback form with prompts and tips sidebar",
  },
  {
    key: "inbox",
    label: "Feedback inbox",
    icon: "i-heroicons-inbox",
    copy: "Three views: received, unread, and given. And if you're a buddy for someone else, you also see their feedback first so you can curate it, decide what's useful, and choose when to publish it to them.",
    image: "/marketing/feature-inbox.webp",
    alt: "Feedback inbox with favourites row and recent feedback table",
  },
  {
    key: "goals",
    label: "Goals",
    icon: "i-heroicons-flag",
    copy: "Personal development goals with milestones, deadlines, and progress rings. Goals carry through to reviews, so progress is part of the conversation when it matters.",
    image: "/marketing/feature-goals.webp",
    alt: "Goals page showing active goals with progress rings and milestones",
  },
  {
    key: "reviews",
    label: "Reviews",
    icon: "i-heroicons-clipboard-document-check",
    copy: "Formal reviews backed by everything that's already happened. Goals, recent feedback, and milestones are pulled in automatically so reviews are grounded in real evidence, not a scramble the night before.",
    image: "/marketing/feature-reviews.webp",
    alt: "Reviews page showing scheduled reviews with linked goals and feedback",
  },
  {
    key: "insights",
    label: "Community insights",
    icon: "i-heroicons-chart-bar",
    copy: "A living team garden that grows the more your team uses Trellis. Plants flourish with regular feedback and wilt when activity drops, giving admins an at-a-glance read on engagement without anyone feeling surveilled. Leaderboards and participation streaks round out the picture.",
    image: "/marketing/feature-insights.webp",
    alt: "Community insights with team activity stats and the Pocketworks garden",
  },
];

const active = ref<TabKey>("submit");
const activeTab = computed(() => tabs.find((t) => t.key === active.value)!);
</script>

<template>
  <section id="features" class="border-t border-white/5">
    <div class="max-w-7xl mx-auto px-6 py-24">
      <div class="text-center max-w-2xl mx-auto">
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          What's inside
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          Everything your team needs to grow together
        </h2>
      </div>

      <div class="mt-12 flex flex-wrap justify-center gap-2" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          :aria-selected="active === tab.key"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border"
          :class="active === tab.key
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'text-white/60 border-white/10 hover:text-white hover:border-white/20'"
          @click="active = tab.key"
        >
          <UIcon :name="tab.icon" class="size-4" />
          {{ tab.label }}
        </button>
      </div>

      <p class="mt-10 text-white/80 text-lg max-w-3xl mx-auto text-center">{{ activeTab.copy }}</p>

      <div class="mt-8">
        <img :src="activeTab.image" :alt="activeTab.alt" class="w-full h-auto">
      </div>
    </div>
  </section>
</template>
