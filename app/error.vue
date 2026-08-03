<template>
  <div class="trellis-error">
    <div class="glow-a" />
    <div class="glow-b" />

    <div class="brand">
      <TrellisLogo :size="26" />
      <span>Trellis</span>
    </div>

    <div class="card">
      <!-- An empty trellis lattice with a vine that grew off the edge,
           looking for a page that isn't there. -->
      <svg class="art" viewBox="0 0 200 200" fill="none" aria-hidden="true">
        <g>
          <g opacity="0.28" stroke="#10b981" stroke-width="2" stroke-linecap="round">
            <line x1="55" y1="30" x2="55" y2="180" />
            <line x1="100" y1="20" x2="100" y2="180" />
            <line x1="145" y1="30" x2="145" y2="180" />
            <line x1="45" y1="60" x2="155" y2="60" />
            <line x1="45" y1="100" x2="155" y2="100" />
            <line x1="45" y1="140" x2="155" y2="140" />
          </g>
          <path d="M82 180 L118 180 L113 196 L87 196 Z" fill="#1f2937" stroke="#374151" stroke-width="1.5" />
          <path
            class="vine"
            d="M100 190 C100 170, 88 158, 100 140 C112 122, 90 108, 100 88 C110 70, 96 56, 104 40 C110 28, 130 30, 138 20"
            stroke="#06d6a0"
            stroke-width="2.5"
            stroke-linecap="round"
            fill="none"
          />
          <path class="leaf l1" d="M100 140 C100 140, 84 134, 80 128 C77 123, 79 118, 85 120 C93 122, 99 132, 100 138" fill="#06d6a0" />
          <path class="leaf l2" d="M100 96 C100 96, 116 90, 120 84 C123 79, 121 74, 115 76 C107 78, 101 88, 100 94" fill="#10b981" />
          <path class="leaf l3" d="M132 34 C132 34, 122 24, 120 18 C119 13, 123 11, 127 15 C132 20, 133 30, 132 34" fill="#06d6a0" />
          <circle cx="138" cy="20" r="3.5" fill="#06d6a0" />
        </g>
      </svg>

      <div class="code">Error {{ error.statusCode }}</div>
      <h1>{{ errorTitle }}</h1>
      <p class="lead">{{ errorMessage }}</p>

      <div class="actions">
        <button class="btn btn-primary" @click="handleBackToDashboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          Back to dashboard
        </button>
        <NuxtLink v-if="showLogin" to="/login" class="btn btn-ghost">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
          </svg>
          Log in
        </NuxtLink>
      </div>

      <p class="hint">Did you know: Teams that hold regular peer reviews are 2.7x more likely to hit their goals.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

const errorTitle = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return "This vine wandered off-trellis";
    case 403:
      return "You do not have access to this page";
    default:
      return "Something went wrong on our end";
  }
});

const errorMessage = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return "The page you're looking for isn't growing here. It may have been moved, renamed, or never planted in the first place.";
    case 403:
      return "You don't have permission to view this page. Contact your admin if you think that's a mistake.";
    default:
      return "An unexpected error occurred. Our team has been notified and is looking into it.";
  }
});

// Sentry's Nuxt integration auto-captures errors that reach this boundary, so
// no manual capture here. (A manual capture triggered Sentry's replay worker,
// which the app CSP blocks - that broke the error page during hydration.)
const handleBackToDashboard = () => clearError({ redirect: "/dashboard" });

// Offer "Log in" only once the session check has resolved and found no user;
// signed-in users just get "Back to dashboard".
const { user, isSessionPending } = useAuth();
const showLogin = computed(() => !isSessionPending.value && !user.value);
</script>

<style scoped>
.trellis-error {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  position: relative;
  overflow: hidden;
  /* Transparent so the themed body background (color + dot grid) shows
     through, matching the rest of the app in both modes. */
  background: transparent;
  color: var(--ui-text);
  -webkit-font-smoothing: antialiased;
}

.glow-a {
  position: absolute;
  top: -120px;
  right: -120px;
  width: 420px;
  height: 420px;
  background: rgba(20, 184, 166, 0.1);
  filter: blur(80px);
  border-radius: 999px;
  pointer-events: none;
}
.glow-b {
  position: absolute;
  bottom: -140px;
  left: -100px;
  width: 420px;
  height: 420px;
  background: rgba(59, 130, 246, 0.08);
  filter: blur(80px);
  border-radius: 999px;
  pointer-events: none;
}

.brand {
  position: absolute;
  top: 28px;
  left: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  color: var(--ui-text-highlighted);
}

.card {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 520px;
}

.art {
  margin: 0 auto 36px;
  width: 200px;
  height: 200px;
  display: block;
}

.code {
  font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace;
  font-size: 15px;
  letter-spacing: 0.35em;
  color: var(--ui-primary);
  text-transform: uppercase;
  margin-bottom: 14px;
}

h1 {
  font-size: 32px;
  font-weight: 800;
  color: var(--ui-text-highlighted);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

p.lead {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ui-text-muted);
  margin-bottom: 32px;
  text-wrap: pretty;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
}
.btn-primary {
  background: linear-gradient(90deg, #14b8a6, #2dd4bf);
  color: #04211d;
}
.btn-primary:hover {
  filter: brightness(1.08);
}
.btn-ghost {
  background: var(--ui-bg-elevated);
  border-color: var(--ui-border);
  color: var(--ui-text-muted);
}
.btn-ghost:hover {
  border-color: var(--ui-primary);
  color: var(--ui-primary);
}

.hint {
  margin-top: 28px;
  font-size: 12px;
  color: var(--ui-text-dimmed);
}

.vine {
  stroke-dasharray: 220;
  stroke-dashoffset: 220;
  animation: grow 2.2s ease forwards 0.3s;
}
@keyframes grow {
  to {
    stroke-dashoffset: 0;
  }
}
.leaf {
  opacity: 0;
  animation: pop 0.4s ease forwards;
  transform-origin: center;
}
.leaf.l1 {
  animation-delay: 1.1s;
}
.leaf.l2 {
  animation-delay: 1.5s;
}
.leaf.l3 {
  animation-delay: 1.9s;
}
@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 0.9;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .vine,
  .leaf {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 0.9;
  }
}
</style>
