<template>
  <section
    id="buddy-system"
    class="border-t border-white/5 relative overflow-hidden"
  >
    <div
      class="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-5 gap-10 items-center"
    >
      <div class="lg:col-span-2">
        <span
          class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold"
        >
          The difference
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          Everyone gets a buddy.
        </h2>
        <div class="mt-6 space-y-4 text-white/70 leading-relaxed">
          <p>
            Most feedback tools collect feedback into a black hole.
            <strong>Trellis</strong>
            pairs every person with a buddy who reads, curates, and discusses
            their feedback with them every few months.
          </p>
          <p>
            Buddies aren't managers. They're peers who care about your growth.
            They see the feedback before you do, help turn it into action, and
            run lightweight quarterly reviews that actually move the needle.
          </p>
        </div>
      </div>

      <div class="lg:col-span-3 relative">
        <div
          class="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full"
          aria-hidden="true"
        />
        <div
          class="relative bg-white/[0.03] border border-white/10 rounded-2xl p-10"
        >
          <div class="flex items-center justify-center gap-8">
            <div class="flex flex-col items-center gap-2">
              <div
                class="size-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-emerald-950 font-bold text-lg"
              >
                A
              </div>
              <span class="text-xs text-white/60">Alex</span>
            </div>
            <div
              class="h-px flex-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-emerald-400/0"
            />
            <div class="flex flex-col items-center gap-2">
              <div
                class="size-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-emerald-950 font-bold text-lg"
              >
                M
              </div>
              <span class="text-xs text-white/60">Matteo (buddy)</span>
            </div>
          </div>

          <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div
              class="bg-white/5 rounded-lg p-3 text-center text-white/70 border border-white/10"
            >
              Weekly feedback flows in
            </div>
            <div
              class="bg-white/5 rounded-lg p-3 text-center text-white/70 border border-white/10"
            >
              Buddy curates and publishes
            </div>
            <div
              class="bg-white/5 rounded-lg p-3 text-center text-white/70 border border-white/10"
            >
              Quarterly review together
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
