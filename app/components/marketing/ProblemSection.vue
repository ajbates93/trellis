<template>
  <section class="border-t border-white/5">
    <div class="max-w-3xl mx-auto px-6 py-20 text-center">
      <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
        The problem
      </span>
      <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
        Feedback at most companies is broken.
      </h2>
      <p class="mt-6 text-lg text-white/70 leading-relaxed">
        It's annual, awkward, and forgotten by the next quarter. People don't know
        how they're doing until review season, and by then the moment is gone. Trellis
        makes feedback a weekly habit instead of a yearly event, so growth is continuous
        and reviews stop being a surprise.
      </p>

      <div class="mt-12 grid grid-cols-2 gap-6 max-w-xl mx-auto">
        <div class="bg-white/5 rounded-lg p-6 border border-white/10">
          <p class="text-xs uppercase text-white/40 font-semibold mb-3">Most companies</p>
          <div class="flex items-end gap-1 h-20">
            <div v-for="i in 11" :key="i" class="flex-1 bg-white/10 rounded-sm" style="height: 10%" />
            <div class="flex-1 bg-white/30 rounded-sm" style="height: 100%" />
          </div>
          <p class="mt-3 text-sm text-white/60">1 conversation/year</p>
        </div>
        <div class="bg-emerald-500/5 rounded-lg p-6 border border-emerald-500/20">
          <p class="text-xs uppercase text-emerald-300 font-semibold mb-3">With Trellis</p>
          <div class="flex items-end gap-1 h-20">
            <div
              v-for="i in 12"
              :key="i"
              class="flex-1 bg-emerald-400 rounded-sm"
              :style="{ height: (60 + (i * 3)) + '%' }"
            />
          </div>
          <p class="mt-3 text-sm text-emerald-300">52 conversations/year</p>
        </div>
      </div>
    </div>
  </section>
</template>
