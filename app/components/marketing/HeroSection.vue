<script setup lang="ts">
function scrollToDemo() {
  document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
}
function scrollToFeatures() {
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <section class="relative overflow-hidden marketing-dot-grid">
    <div
      class="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 lg:items-start"
    >
      <div>
        <span
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
        >
          <TrellisLogo :size="14" />
          Peer feedback, made regular
        </span>

        <h1
          class="mt-6 text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]"
        >
          Better feedback.<br />Stronger teams.
        </h1>

        <p class="mt-6 text-lg text-white/70 max-w-xl">
          A structured, lightweight way for your team to share regular peer
          feedback, track goals, celebrate achievements, and grow together,
          without anyone having to chase it.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <button
            class="bg-emerald-500 text-emerald-950 font-semibold px-6 py-3 rounded-md hover:bg-emerald-400 transition"
            @click="scrollToDemo"
          >
            Book a demo
          </button>
          <button
            class="text-white border border-white/20 px-6 py-3 rounded-md hover:bg-white/5 transition"
            @click="scrollToFeatures"
          >
            See it in action
          </button>
        </div>

        <p class="mt-8 text-sm text-white/40">
          Built by Pocketworks - Used by teams who care about growth
        </p>
      </div>

      <div class="relative">
        <div
          class="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"
          aria-hidden="true"
        />
        <div
          class="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
        >
          <img
            src="/marketing/hero-dashboard.webp"
            alt="Trellis dashboard showing the next review, recent activity, and feedback pulse chart"
            class="w-full h-auto"
          />
        </div>
      </div>
    </div>
  </section>
</template>
