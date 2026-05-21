<script setup lang="ts">
const form = reactive({
  name: "",
  email: "",
  company: "",
  teamSize: "11-50" as "just-me" | "2-10" | "11-50" | "51-200" | "200+",
  message: "",
  website: "", // honeypot
});

const submitting = ref(false);
const submitted = ref(false);
const error = ref<string | null>(null);

const teamSizes = [
  { value: "just-me", label: "Just me" },
  { value: "2-10", label: "2-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "200+", label: "200+" },
];

const canSubmit = computed(
  () => form.name.trim() && form.email.trim() && form.company.trim() && !submitting.value
);

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  error.value = null;

  try {
    await $fetch("/api/marketing/demo-request", {
      method: "POST",
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        teamSize: form.teamSize,
        message: form.message.trim() || null,
        website: form.website,
      },
    });
    submitted.value = true;
  } catch (err: any) {
    error.value =
      err?.data?.message ||
      "Something went wrong. Please try again or email alex.bates@pocketworks.co.uk.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section id="demo-form" class="border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12">
      <div>
        <span class="inline-block text-xs uppercase tracking-widest text-white/40 font-semibold">
          Ready to start?
        </span>
        <h2 class="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
          See Trellis in your team.
        </h2>
        <p class="mt-6 text-white/70 leading-relaxed">
          Tell us a bit about your team and we'll set up a 20-minute walkthrough.
          No slide decks, no obligation - we'll show you the product and answer your questions.
        </p>
        <ul class="mt-8 space-y-3 text-sm text-white/70">
          <li class="flex items-start gap-3">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Demo runs on your real org's data if you want</span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Set up your workspace the same week</span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-heroicons-check-circle" class="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>No card required, no auto-billing</span>
          </li>
        </ul>
      </div>

      <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
        <div v-if="submitted" class="text-center py-12">
          <UIcon name="i-heroicons-check-circle" class="size-16 text-emerald-400 mx-auto" />
          <h3 class="mt-4 text-2xl font-semibold">Got it.</h3>
          <p class="mt-2 text-white/70">We'll be in touch within one working day.</p>
        </div>

        <form v-else class="space-y-4" @submit.prevent="submit">
          <!-- Honeypot - hidden from humans -->
          <div aria-hidden="true" style="position: absolute; left: -9999px;">
            <label>
              Website
              <input v-model="form.website" type="text" tabindex="-1" autocomplete="off">
            </label>
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Your name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Work email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Company</label>
            <input
              v-model="form.company"
              type="text"
              required
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">Team size</label>
            <select
              v-model="form.teamSize"
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option v-for="size in teamSizes" :key="size.value" :value="size.value">
                {{ size.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm text-white/70 mb-1.5">
              What are you hoping to solve?
              <span class="text-white/30">(optional)</span>
            </label>
            <textarea
              v-model="form.message"
              rows="4"
              placeholder="e.g. our annual reviews are painful, we want something lighter..."
              class="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <p v-if="error" class="text-sm text-red-400" role="alert" aria-live="polite">{{ error }}</p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="w-full bg-emerald-500 text-emerald-950 font-semibold px-4 py-3 rounded-md hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <UIcon v-if="submitting" name="i-heroicons-arrow-path" class="size-4 animate-spin" />
            {{ submitting ? "Sending..." : "Request a demo" }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
