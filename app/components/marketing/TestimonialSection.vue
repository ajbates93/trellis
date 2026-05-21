<script setup lang="ts">
interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  logo?: string;
}

// PLACEHOLDER: Tobin quote is made up; swap before launch.
const testimonials: Testimonial[] = [
  {
    quote:
      "I used to rely on sporadic conversations to know how the team was really getting on, and even then you're not getting the full picture. Trellis turned that into something I can see, week by week. Relationships stay healthy, growth is visible, and I'm no longer the bottleneck on knowing what's happening across the team.",
    author: "Tobin Harris",
    role: "Managing Director",
    company: "Pocketworks",
  },
];

const featured = testimonials[0];
</script>

<template>
  <section class="border-t border-white/5 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-emerald-500/10 blur-3xl rounded-full"
      />
    </div>

    <div class="relative max-w-3xl mx-auto px-6 py-24 text-center">
      <span
        class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold"
      >
        Trusted by teams who care about growth
      </span>

      <blockquote
        class="mt-8 text-xl md:text-2xl text-white/90 leading-relaxed"
      >
        "{{ featured.quote }}"
      </blockquote>

      <div class="mt-8 text-sm text-white/60">
        <span class="font-semibold text-white">{{ featured.author }}</span
        >, {{ featured.role }}, {{ featured.company }}
      </div>

    </div>
  </section>
</template>
