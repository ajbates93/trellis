<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useHead } from '#app'

// Set up SEO head
useHead({
  title: 'Trellis | Peer feedback that grows your team',
  meta: [
    {
      name: 'description',
      content: 'Trellis is the peer feedback platform that helps teams give meaningful feedback, track goals, and grow together. Built for modern teams.',
    },
  ],
  link: [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: true,
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    },
  ],
})

// Configure page layout
definePageMeta({
  layout: false,
})

// Light mode override - remove dark class on mount, restore on unmount
onMounted(() => {
  document.documentElement.classList.remove('dark')

  // Set up scroll observer for fade-up animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  }, {
    threshold: 0.1,
  })

  // Observe all fade-up elements
  document.querySelectorAll('.fade-up').forEach((el) => {
    observer.observe(el)
  })
})

onUnmounted(() => {
  document.documentElement.classList.add('dark')
})

// Show panel function for showcase tabs
function showPanel(name: string) {
  // Hide all panels
  document.querySelectorAll('.showcase-panel').forEach((p) => {
    (p as HTMLElement).style.display = 'none'
  })

  // Show selected
  const panel = document.getElementById('panel-' + name)
  if (panel) {
    (panel as HTMLElement).style.display = 'block'
    // Re-trigger animation
    (panel as HTMLElement).style.animation = 'none'
    ;(panel as HTMLElement).offsetHeight
    (panel as HTMLElement).style.animation = ''
  }

  // Update tab styles
  document.querySelectorAll('.showcase-tab').forEach((tab) => {
    tab.classList.remove('border-[#10b981]', 'bg-[#ecfdf5]')
    tab.classList.add('border-stone-200', 'bg-white')
    const icon = tab.querySelector('.w-8')
    if (icon) {
      icon.classList.remove('bg-[#d1fae5]')
      icon.classList.add('bg-stone-100')
      const svg = icon.querySelector('svg')
      if (svg) {
        svg.classList.remove('text-[#059669]')
        svg.classList.add('text-stone-500')
      }
    }
    const title = tab.querySelector('h3')
    if (title) {
      title.classList.remove('text-[#064e3b]')
      title.classList.add('text-stone-700')
    }
    const desc = tab.querySelector('p')
    if (desc) {
      desc.classList.remove('text-stone-600')
      desc.classList.add('text-stone-500')
    }
  })

  // Activate selected tab
  const activeTab = document.getElementById('tab-' + name)
  if (activeTab) {
    activeTab.classList.remove('border-stone-200', 'bg-white')
    activeTab.classList.add('border-[#10b981]', 'bg-[#ecfdf5]')
    const icon = activeTab.querySelector('.w-8')
    if (icon) {
      icon.classList.remove('bg-stone-100')
      icon.classList.add('bg-[#d1fae5]')
      const svg = icon.querySelector('svg')
      if (svg) {
        svg.classList.remove('text-stone-500')
        svg.classList.add('text-[#059669]')
      }
    }
    const title = activeTab.querySelector('h3')
    if (title) {
      title.classList.remove('text-stone-700')
      title.classList.add('text-[#064e3b]')
    }
    const desc = activeTab.querySelector('p')
    if (desc) {
      desc.classList.remove('text-stone-500')
      desc.classList.add('text-stone-600')
    }
  }
}

// Expose showPanel to global scope for onclick handlers
if (typeof window !== 'undefined') {
  (window as any).showPanel = showPanel
}
</script>

<template>
  <div class="bg-stone-50 text-[#022c22] antialiased">
    <!-- ============================================ -->
    <!-- NAVBAR                                       -->
    <!-- ============================================ -->
    <nav class="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200/60">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <!-- Logo -->
        <a href="#" class="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(2, 0)">
              <g opacity="0.6">
                <line x1="8" y1="6" x2="8" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="14" y1="4" x2="14" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="20" y1="6" x2="20" y2="28" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="6" y1="10" x2="22" y2="10" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="6" y1="16" x2="22" y2="16" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="6" y1="22" x2="22" y2="22" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
              </g>
              <g>
                <path d="M14 26 C14 26, 14 18, 14 12" stroke="#06d6a0" stroke-width="2" stroke-linecap="round" fill="none"/>
                <path d="M14 16 C14 16, 10 14, 8 13 C6 12, 5 11, 6 9 C7 7, 10 8, 12 10 C13 11, 14 13, 14 14" fill="#06d6a0" opacity="0.9"/>
                <path d="M14 14 C14 14, 18 12, 20 11 C22 10, 23 9, 22 7 C21 5, 18 6, 16 8 C15 9, 14 11, 14 12" fill="#10b981" opacity="0.9"/>
                <circle cx="14" cy="10" r="2.5" fill="#06d6a0"/>
                <circle cx="14" cy="10" r="1.5" fill="#10b981" opacity="0.7"/>
                <path d="M14 20 C14 20, 17 19, 18 18.5 C19 18, 19.5 17.5, 19 16.5 C18.5 15.5, 16.5 16, 15 17 C14.5 17.5, 14 18.5, 14 19" fill="#06d6a0" opacity="0.7"/>
              </g>
            </g>
          </svg>
          <span class="text-xl font-bold tracking-tight text-[#064e3b]">Trellis</span>
        </a>

        <!-- Nav links (hidden on mobile) -->
        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-[#065f46]">
          <a href="#features" class="hover:text-[#059669] transition-colors">Features</a>
          <a href="#how-it-works" class="hover:text-[#059669] transition-colors">How It Works</a>
          <a href="#integrations" class="hover:text-[#059669] transition-colors">Integrations</a>
        </div>

        <!-- CTA -->
        <div class="flex items-center gap-3">
          <a href="#cta" class="hidden sm:inline-flex items-center gap-2 bg-[#064e3b] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#065f46] transition-colors">
            Book a Demo
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </a>
        </div>
      </div>
    </nav>

    <!-- ============================================ -->
    <!-- HERO - Bento Grid                             -->
    <!-- ============================================ -->
    <section class="max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-24">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">

        <!-- Headline card -->
        <div class="lg:col-span-5 bg-[#d1fae5] rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-[340px]">
          <div>
            <h1 class="text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight text-[#022c22]">
              Better feedback.<br/>Stronger teams.
            </h1>
            <p class="mt-5 text-lg text-[#065f46]/80 leading-relaxed max-w-md">
              Give your team a simple, structured way to share peer feedback, track goals, and grow together. Every week.
            </p>
          </div>
        </div>

        <!-- Product mockup card -->
        <div class="lg:col-span-7 bg-stone-100 border border-stone-200/80 rounded-3xl p-6 md:p-8 pb-10 md:pb-12 relative overflow-hidden min-h-[340px]" style="background: linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #f5f5f4 100%);">

          <!-- Floating UI mockup cards -->
          <div class="relative w-full h-full flex items-center justify-center gap-4">

            <!-- Card 1: Feedback -->
            <div class="float-1 bg-white rounded-2xl shadow-lg shadow-[#064e3b]/5 p-5 w-48 flex-shrink-0">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 rounded-full bg-[#d1fae5] flex items-center justify-center">
                  <svg class="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                </div>
                <span class="text-xs font-semibold text-[#047857]">Feedback</span>
              </div>
              <p class="text-xs text-[#059669] leading-relaxed">"Your presentation was clear and well-structured. The data visualisations really helped."</p>
              <div class="mt-3 flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-[#a7f3d0]"></div>
                <span class="text-[10px] text-[#10b981] font-medium">Sarah M. · This week</span>
              </div>
            </div>

            <!-- Card 2: Dashboard stats -->
            <div class="float-2 bg-white rounded-2xl shadow-lg shadow-[#064e3b]/5 p-5 w-52 flex-shrink-0 hidden sm:block">
              <p class="text-xs font-semibold text-[#10b981] uppercase tracking-wider mb-1">Feedback received</p>
              <p class="text-3xl font-extrabold text-[#064e3b]">24</p>
              <div class="mt-1 inline-flex items-center gap-1 bg-[#d1fae5] text-[#047857] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                +12%
              </div>
              <div class="mt-4 flex gap-1 items-end h-10">
                <div class="w-3 bg-[#a7f3d0] rounded-sm" style="height:40%"></div>
                <div class="w-3 bg-[#a7f3d0] rounded-sm" style="height:55%"></div>
                <div class="w-3 bg-[#6ee7b7] rounded-sm" style="height:45%"></div>
                <div class="w-3 bg-[#6ee7b7] rounded-sm" style="height:70%"></div>
                <div class="w-3 bg-[#34d399] rounded-sm" style="height:60%"></div>
                <div class="w-3 bg-[#34d399] rounded-sm" style="height:85%"></div>
                <div class="w-3 bg-[#10b981] rounded-sm" style="height:100%"></div>
                <div class="w-3 bg-[#10b981] rounded-sm" style="height:90%"></div>
              </div>
            </div>

            <!-- Card 3: Goals -->
            <div class="float-3 bg-white rounded-2xl shadow-lg shadow-[#064e3b]/5 p-5 w-48 flex-shrink-0 hidden md:block">
              <p class="text-xs font-semibold text-[#10b981] uppercase tracking-wider mb-3">Active Goals</p>
              <div class="space-y-2.5">
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="font-medium text-[#065f46]">Lead retro sessions</span>
                    <span class="text-[#10b981]">75%</span>
                  </div>
                  <div class="h-1.5 bg-[#d1fae5] rounded-full"><div class="h-1.5 bg-[#10b981] rounded-full" style="width:75%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="font-medium text-[#065f46]">Improve code reviews</span>
                    <span class="text-[#10b981]">40%</span>
                  </div>
                  <div class="h-1.5 bg-[#d1fae5] rounded-full"><div class="h-1.5 bg-[#06d6a0] rounded-full" style="width:40%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="font-medium text-[#065f46]">Mentor junior devs</span>
                    <span class="text-[#10b981]">90%</span>
                  </div>
                  <div class="h-1.5 bg-[#d1fae5] rounded-full"><div class="h-1.5 bg-[#10b981] rounded-full" style="width:90%"></div></div>
                </div>
              </div>
            </div>

          </div>

          <!-- Labels beneath mockups -->
          <div class="flex justify-around mt-4 text-xs font-semibold text-[#047857]">
            <span class="bg-white px-3 py-1 rounded-full shadow-sm">Feedback</span>
            <span class="bg-white px-3 py-1 rounded-full shadow-sm hidden sm:inline">Dashboard</span>
            <span class="bg-white px-3 py-1 rounded-full shadow-sm hidden md:inline">Goals</span>
          </div>
        </div>

        <!-- CTA card -->
        <div class="lg:col-span-5 bg-[#064e3b] rounded-3xl p-6 md:p-8 flex items-center justify-between cursor-pointer hover:bg-[#065f46] transition-colors group">
          <div>
            <p class="text-white font-bold text-lg">Book a Demo</p>
            <p class="text-[#a7f3d0] text-sm mt-0.5">See Trellis in action for your team</p>
          </div>
          <svg class="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </div>

        <!-- Social proof mini card -->
        <div class="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-stone-400">
          <span class="font-medium text-stone-500">Built by</span>
          <span class="font-bold text-[#064e3b] text-base tracking-tight">Pocketworks</span>
          <span class="hidden sm:inline text-stone-300">·</span>
          <span class="text-stone-500">Trusted by teams who care about growth</span>
        </div>

      </div>
    </section>

    <!-- ============================================ -->
    <!-- THE PROBLEM                                  -->
    <!-- ============================================ -->
    <section class="max-w-7xl mx-auto px-6 py-16 md:py-24 fade-up">
      <div class="max-w-3xl">
        <span class="inline-block bg-[#d1fae5] text-[#047857] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">The problem</span>
        <h2 class="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-[#022c22]">
          Feedback gets lost. Growth stalls. Reviews become guesswork.
        </h2>
        <p class="mt-5 text-lg text-stone-600 leading-relaxed max-w-2xl">
          Most teams rely on annual reviews and scattered Slack messages. Feedback is inconsistent, managers lack visibility, and employees don't know where they stand until it's too late.
        </p>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- FEATURES - Bento Grid                         -->
    <!-- ============================================ -->
    <section id="features" class="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
      <div class="fade-up mb-12">
        <span class="inline-block bg-[#d1fae5] text-[#047857] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">The solution</span>
        <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-[#022c22]">Everything your team needs to grow</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <!-- Feature 1: Weekly Feedback -->
        <div class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300">
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5">
            <svg class="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">Weekly Peer Feedback</h3>
          <p class="text-sm text-stone-600 leading-relaxed">Lightweight weekly check-ins make feedback a habit, not an event. One review per person per week keeps things consistent and low-pressure.</p>
        </div>

        <!-- Feature 2: Buddy System -->
        <div class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300">
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5">
            <svg class="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">Buddy System</h3>
          <p class="text-sm text-stone-600 leading-relaxed">Pair everyone with a buddy who reviews, publishes, and supports their growth. Buddies see all feedback and help turn it into action.</p>
        </div>

        <!-- Feature 3: Goal Tracking -->
        <div class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300">
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5">
            <svg class="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">Goal Tracking</h3>
          <p class="text-sm text-stone-600 leading-relaxed">Set personal development goals with milestones and deadlines. Track progress over time and connect goals directly to the feedback you receive.</p>
        </div>

        <!-- Feature 4: Trellis Garden -->
        <div class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300">
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5 text-xl">
            🌱
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">Trellis Garden</h3>
          <p class="text-sm text-stone-600 leading-relaxed">A living visualisation of your team's feedback health. Watch your garden grow from wilting to thriving as your team builds the feedback habit.</p>
        </div>

        <!-- Feature 5: Insights & Analytics -->
        <div class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300">
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5">
            <svg class="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">Insights & Analytics</h3>
          <p class="text-sm text-stone-600 leading-relaxed">Sentiment analysis, engagement trends, and contribution leaderboards. Admins get a clear picture of team health at a glance.</p>
        </div>

        <!-- Feature 6: Admin Onboarding -->
        <div class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300">
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5">
            <svg class="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">Easy Team Setup</h3>
          <p class="text-sm text-stone-600 leading-relaxed">Import your team via CSV, assign buddies, and go. Invitation-based access means your people see their relationships from the moment they log in.</p>
        </div>

      </div>
    </section>

    <!-- ============================================ -->
    <!-- PRODUCT SHOWCASE - Interactive Panels         -->
    <!-- ============================================ -->
    <section class="max-w-7xl mx-auto px-6 py-16 md:py-24">
      <div class="fade-up mb-12">
        <span class="inline-block bg-[#d1fae5] text-[#047857] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">See it in action</span>
        <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-[#022c22]">Built to make feedback easy</h2>
      </div>

      <div class="fade-up grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <!-- Left: Tabs -->
        <div class="lg:col-span-4 flex flex-col gap-3">
          <button @click="showPanel('submit')" id="tab-submit" class="showcase-tab active text-left rounded-2xl p-5 border-2 border-[#10b981] bg-[#ecfdf5] transition-all duration-300">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-xl bg-[#d1fae5] flex items-center justify-center">
                <svg class="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </div>
              <h3 class="font-bold text-[#064e3b]">Submit Feedback</h3>
            </div>
            <p class="text-sm text-stone-600 leading-relaxed">Pick a colleague, write a short note about their work, and submit. Guided prompts help you write useful, specific feedback in under two minutes.</p>
          </button>

          <button @click="showPanel('inbox')" id="tab-inbox" class="showcase-tab text-left rounded-2xl p-5 border-2 border-stone-200 bg-white transition-all duration-300 hover:border-stone-300">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
              </div>
              <h3 class="font-bold text-stone-700">Feedback Inbox</h3>
            </div>
            <p class="text-sm text-stone-500 leading-relaxed">See all the feedback you've received in one place. Filter by read, unread, or given. Your buddy reviews and publishes new feedback for you.</p>
          </button>

          <button @click="showPanel('goals')" id="tab-goals" class="showcase-tab text-left rounded-2xl p-5 border-2 border-stone-200 bg-white transition-all duration-300 hover:border-stone-300">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h3 class="font-bold text-stone-700">Track Goals</h3>
            </div>
            <p class="text-sm text-stone-500 leading-relaxed">Set development goals with milestones and target dates. Progress bars keep you honest, and your buddy can see how you're tracking.</p>
          </button>

          <button @click="showPanel('insights')" id="tab-insights" class="showcase-tab text-left rounded-2xl p-5 border-2 border-stone-200 bg-white transition-all duration-300 hover:border-stone-300">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center">
                <svg class="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
              <h3 class="font-bold text-stone-700">Team Insights</h3>
            </div>
            <p class="text-sm text-stone-500 leading-relaxed">Admins get a bird's-eye view of team engagement, sentiment trends, and who's contributing. Data you can act on, not just look at.</p>
          </button>
        </div>

        <!-- Right: Mockup Panel (sticky on desktop) -->
        <div class="lg:col-span-8 lg:sticky lg:top-20 lg:self-start">
          <div class="bg-stone-900 rounded-2xl overflow-hidden shadow-2xl shadow-stone-900/20">
            <!-- Window chrome -->
            <div class="flex items-center gap-2 px-4 py-3 bg-stone-800">
              <div class="w-3 h-3 rounded-full bg-stone-600"></div>
              <div class="w-3 h-3 rounded-full bg-stone-600"></div>
              <div class="w-3 h-3 rounded-full bg-stone-600"></div>
            </div>

            <!-- Panel: Submit Feedback -->
            <div id="panel-submit" class="showcase-panel" style="display:block;">
              <div class="flex min-h-[420px]">
                <!-- Mini sidebar -->
                <div class="hidden sm:flex w-40 bg-stone-800/80 flex-col p-3 gap-0.5 border-r border-stone-700/50 flex-shrink-0">
                  <div class="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><g transform="translate(2,0)"><g opacity="0.6"><line x1="8" y1="6" x2="8" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="4" x2="14" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="6" x2="20" y2="28" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/></g><g><circle cx="14" cy="10" r="2.5" fill="#06d6a0"/></g></g></svg>
                    <span class="text-white text-xs font-bold">Trellis</span>
                  </div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Personal</div>
                  <div class="text-[11px] whitespace-nowrap text-[#06d6a0] font-semibold bg-[#10b981]/10 rounded-lg px-2 py-1.5">Submit</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Brag Bucket</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Insights</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Feedback</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Goals</div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mt-2 mb-1">Buddy</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Buddies</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Feedback</div>
                </div>
                <!-- Main content -->
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Submit Feedback</h3>
                  <p class="text-stone-400 text-xs mb-5">Share feedback with a colleague</p>

                  <!-- Colleague card -->
                  <div class="bg-[#064e3b]/40 border border-[#10b981]/30 rounded-xl p-3.5 flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-[#047857] flex items-center justify-center text-white text-xs font-bold">L</div>
                      <div>
                        <span class="text-white text-sm font-semibold">Lucy</span>
                        <span class="text-[#06d6a0] text-[10px] ml-1.5 bg-[#10b981]/20 px-1.5 py-0.5 rounded">Growth</span>
                        <p class="text-stone-500 text-[10px] mt-0.5">You've never given feedback to Lucy</p>
                      </div>
                    </div>
                    <span class="text-[#06d6a0] text-xs font-medium">Change</span>
                  </div>

                  <!-- Prompt -->
                  <div class="bg-[#064e3b]/20 border border-[#10b981]/20 rounded-xl p-3 flex items-center gap-2 mb-4">
                    <svg class="w-4 h-4 text-[#06d6a0] flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    <span class="text-[#06d6a0] text-xs">What's one thing this person should definitely keep doing?</span>
                  </div>

                  <!-- Text area -->
                  <div class="bg-stone-800 border border-stone-700 rounded-xl p-3 h-24 mb-3">
                    <span class="text-stone-500 text-xs">What have you noticed about their work recently? Be specific...</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-stone-600 text-[10px]">0 characters (minimum 10)</span>
                    <button class="bg-[#10b981] text-white text-xs font-semibold px-4 py-2 rounded-lg">Submit Feedback</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panel: Feedback Inbox -->
            <div id="panel-inbox" class="showcase-panel" style="display:none;">
              <div class="flex min-h-[420px]">
                <!-- Mini sidebar -->
                <div class="hidden sm:flex w-40 bg-stone-800/80 flex-col p-3 gap-0.5 border-r border-stone-700/50 flex-shrink-0">
                  <div class="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><g transform="translate(2,0)"><g opacity="0.6"><line x1="8" y1="6" x2="8" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="4" x2="14" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="6" x2="20" y2="28" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/></g><g><circle cx="14" cy="10" r="2.5" fill="#06d6a0"/></g></g></svg>
                    <span class="text-white text-xs font-bold">Trellis</span>
                  </div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Personal</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Submit</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Brag Bucket</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Insights</div>
                  <div class="text-[11px] whitespace-nowrap text-[#06d6a0] font-semibold bg-[#10b981]/10 rounded-lg px-2 py-1.5">Feedback <span class="bg-[#10b981] text-white text-[8px] px-1 py-0.5 rounded-full ml-0.5">3</span></div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Goals</div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mt-2 mb-1">Buddy</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Buddies</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Feedback</div>
                </div>
                <!-- Main content -->
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Feedback Inbox</h3>
                  <p class="text-stone-400 text-xs mb-5">View and manage your feedback</p>

                  <!-- Tabs -->
                  <div class="flex bg-stone-800 rounded-xl p-1 mb-5 text-xs font-semibold">
                    <div class="flex-1 text-center py-2 bg-stone-700 rounded-lg text-white">Received <span class="bg-stone-600 text-stone-300 px-1.5 py-0.5 rounded text-[10px] ml-1">8</span></div>
                    <div class="flex-1 text-center py-2 text-stone-400">Unread <span class="text-[10px] ml-1">3</span></div>
                    <div class="flex-1 text-center py-2 text-stone-400">Given <span class="text-[10px] ml-1">36</span></div>
                  </div>

                  <!-- Recent cards -->
                  <div class="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-2">Recent Feedback</div>
                  <div class="grid grid-cols-3 gap-2.5 mb-5">
                    <div class="bg-stone-800 border border-stone-700 rounded-xl p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">R</div>
                        <span class="text-white text-xs font-semibold">Rory</span>
                        <span class="text-stone-600 text-[9px] ml-auto">28d ago</span>
                      </div>
                      <p class="text-stone-400 text-[10px] leading-relaxed">Test coverage has been slipping lately. Would be good to prioritize writing tests...</p>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-[9px] text-[#06d6a0] bg-[#10b981]/10 px-1.5 py-0.5 rounded font-medium">Read</span>
                        <svg class="w-3 h-3 text-stone-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                      </div>
                    </div>
                    <div class="bg-stone-800 border border-stone-700 rounded-xl p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-[9px] font-bold">M</div>
                        <span class="text-white text-xs font-semibold">Marcin</span>
                        <span class="text-stone-600 text-[9px] ml-auto">1mo ago</span>
                      </div>
                      <p class="text-stone-400 text-[10px] leading-relaxed">Never cuts corners. Always delivers polished, production-ready work.</p>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-[9px] text-[#06d6a0] bg-[#10b981]/10 px-1.5 py-0.5 rounded font-medium">Read</span>
                        <svg class="w-3 h-3 text-stone-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                      </div>
                    </div>
                    <div class="bg-stone-800 border border-stone-700 rounded-xl p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white text-[9px] font-bold">A</div>
                        <span class="text-white text-xs font-semibold">Ava</span>
                        <span class="text-stone-600 text-[9px] ml-auto">2mo ago</span>
                      </div>
                      <p class="text-stone-400 text-[10px] leading-relaxed">Design thinking is on point. Love how you solve for edge cases.</p>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-[9px] text-[#06d6a0] bg-[#10b981]/10 px-1.5 py-0.5 rounded font-medium">Read</span>
                        <svg class="w-3 h-3 text-stone-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                      </div>
                    </div>
                  </div>

                  <!-- Stat badges -->
                  <div class="flex gap-3">
                    <div class="flex-1 bg-stone-800/50 rounded-xl p-3 text-center">
                      <p class="text-stone-500 text-[9px] uppercase tracking-wider font-semibold mb-1">Total received</p>
                      <p class="text-white text-lg font-extrabold">42</p>
                    </div>
                    <div class="flex-1 bg-stone-800/50 rounded-xl p-3 text-center">
                      <p class="text-stone-500 text-[9px] uppercase tracking-wider font-semibold mb-1">This month</p>
                      <p class="text-white text-lg font-extrabold">8</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panel: Goals -->
            <div id="panel-goals" class="showcase-panel" style="display:none;">
              <div class="flex min-h-[420px]">
                <!-- Mini sidebar -->
                <div class="hidden sm:flex w-40 bg-stone-800/80 flex-col p-3 gap-0.5 border-r border-stone-700/50 flex-shrink-0">
                  <div class="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><g transform="translate(2,0)"><g opacity="0.6"><line x1="8" y1="6" x2="8" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="4" x2="14" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="6" x2="20" y2="28" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/></g><g><circle cx="14" cy="10" r="2.5" fill="#06d6a0"/></g></g></svg>
                    <span class="text-white text-xs font-bold">Trellis</span>
                  </div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Personal</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Submit</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Brag Bucket</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Insights</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Feedback</div>
                  <div class="text-[11px] whitespace-nowrap text-[#06d6a0] font-semibold bg-[#10b981]/10 rounded-lg px-2 py-1.5">Goals</div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mt-2 mb-1">Buddy</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Buddies</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Feedback</div>
                </div>
                <!-- Main content -->
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Track Goals</h3>
                  <p class="text-stone-400 text-xs mb-5">Set and manage your development goals</p>

                  <!-- Goal card 1 -->
                  <div class="bg-stone-800 border border-stone-700 rounded-xl p-4 mb-3">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="text-white text-sm font-semibold">Improve code review timeliness</h4>
                        <p class="text-stone-500 text-[10px] mt-1">Target: 24 hours</p>
                      </div>
                      <span class="text-[9px] bg-[#10b981]/20 text-[#06d6a0] px-2 py-1 rounded-full font-medium">Active</span>
                    </div>
                    <div class="bg-stone-900 rounded-full h-2">
                      <div class="bg-[#10b981] h-2 rounded-full" style="width: 65%"></div>
                    </div>
                    <p class="text-stone-500 text-[10px] mt-2">65% progress · Est. completion in 2 weeks</p>
                  </div>

                  <!-- Goal card 2 -->
                  <div class="bg-stone-800 border border-stone-700 rounded-xl p-4 mb-3">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="text-white text-sm font-semibold">Mentoring: Junior developers</h4>
                        <p class="text-stone-500 text-[10px] mt-1">Milestone: Review 2 PRs per week</p>
                      </div>
                      <span class="text-[9px] bg-[#10b981]/20 text-[#06d6a0] px-2 py-1 rounded-full font-medium">Active</span>
                    </div>
                    <div class="bg-stone-900 rounded-full h-2">
                      <div class="bg-[#06d6a0] h-2 rounded-full" style="width: 40%"></div>
                    </div>
                    <p class="text-stone-500 text-[10px] mt-2">40% progress · Last updated 3 days ago</p>
                  </div>

                  <!-- Goal card 3 -->
                  <div class="bg-stone-800 border border-stone-700 rounded-xl p-4">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="text-white text-sm font-semibold">Public speaking: Team talks</h4>
                        <p class="text-stone-500 text-[10px] mt-1">Target: 1 talk per quarter</p>
                      </div>
                      <span class="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-medium">Planning</span>
                    </div>
                    <div class="bg-stone-900 rounded-full h-2">
                      <div class="bg-blue-500 h-2 rounded-full" style="width: 15%"></div>
                    </div>
                    <p class="text-stone-500 text-[10px] mt-2">15% progress · Not started yet</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panel: Insights -->
            <div id="panel-insights" class="showcase-panel" style="display:none;">
              <div class="flex min-h-[420px]">
                <!-- Mini sidebar -->
                <div class="hidden sm:flex w-40 bg-stone-800/80 flex-col p-3 gap-0.5 border-r border-stone-700/50 flex-shrink-0">
                  <div class="flex items-center gap-2 mb-4">
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><g transform="translate(2,0)"><g opacity="0.6"><line x1="8" y1="6" x2="8" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="4" x2="14" y2="26" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="6" x2="20" y2="28" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/></g><g><circle cx="14" cy="10" r="2.5" fill="#06d6a0"/></g></g></svg>
                    <span class="text-white text-xs font-bold">Trellis</span>
                  </div>
                  <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Admin</div>
                  <div class="text-[11px] whitespace-nowrap text-[#06d6a0] font-semibold bg-[#10b981]/10 rounded-lg px-2 py-1.5">Insights</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Team Members</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Feedback Logs</div>
                  <div class="text-[11px] whitespace-nowrap text-stone-400 px-2 py-1.5">Settings</div>
                </div>
                <!-- Main content -->
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Team Insights</h3>
                  <p class="text-stone-400 text-xs mb-5">Your team's engagement and health metrics</p>

                  <!-- Stats -->
                  <div class="grid grid-cols-3 gap-3 mb-5">
                    <div class="bg-stone-800 rounded-xl p-3 text-center">
                      <p class="text-stone-500 text-[9px] uppercase tracking-wider font-semibold">Feedback given</p>
                      <p class="text-white text-2xl font-extrabold mt-1">342</p>
                      <p class="text-stone-500 text-[9px] mt-1">This month</p>
                    </div>
                    <div class="bg-stone-800 rounded-xl p-3 text-center">
                      <p class="text-stone-500 text-[9px] uppercase tracking-wider font-semibold">Avg per person</p>
                      <p class="text-white text-2xl font-extrabold mt-1">11.4</p>
                      <p class="text-stone-500 text-[9px] mt-1">Very healthy</p>
                    </div>
                    <div class="bg-stone-800 rounded-xl p-3 text-center">
                      <p class="text-stone-500 text-[9px] uppercase tracking-wider font-semibold">Team health</p>
                      <p class="text-white text-2xl font-extrabold mt-1">87%</p>
                      <p class="text-stone-500 text-[9px] mt-1">On track</p>
                    </div>
                  </div>

                  <!-- Top contributors -->
                  <div>
                    <p class="text-stone-500 text-[10px] uppercase tracking-wider font-semibold mb-2">Top contributors this month</p>
                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-bold">S</div>
                          <span class="text-white font-medium">Sarah M.</span>
                        </div>
                        <span class="text-[#06d6a0] font-semibold">42 feedback</span>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-[8px] font-bold">M</div>
                          <span class="text-white font-medium">Marcin</span>
                        </div>
                        <span class="text-[#06d6a0] font-semibold">38 feedback</span>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-[8px] font-bold">J</div>
                          <span class="text-white font-medium">James P.</span>
                        </div>
                        <span class="text-[#06d6a0] font-semibold">35 feedback</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ============================================ -->
    <!-- CTA SECTION                                 -->
    <!-- ============================================ -->
    <section id="cta" class="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center fade-up">
      <h2 class="text-4xl md:text-5xl font-extrabold text-[#022c22] mb-6 leading-tight">
        Ready to strengthen your team?
      </h2>
      <p class="text-xl text-stone-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Join teams like Pocketworks who are building a feedback-first culture. Book a demo and see how Trellis can help your team grow.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button class="bg-[#064e3b] text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-[#065f46] transition-colors">
          Book a Demo
        </button>
        <button class="border-2 border-[#10b981] text-[#064e3b] text-lg font-semibold px-8 py-4 rounded-full hover:bg-[#ecfdf5] transition-colors">
          Learn More
        </button>
      </div>
    </section>

    <!-- ============================================ -->
    <!-- FOOTER                                      -->
    <!-- ============================================ -->
    <footer class="border-t border-stone-200/60 bg-stone-50/50 py-8 text-center">
      <div class="max-w-7xl mx-auto px-6">
        <p class="text-sm text-stone-600">
          Built by <span class="font-semibold text-[#064e3b]">Pocketworks</span> for teams who care about growth
        </p>
        <p class="text-xs text-stone-500 mt-4">
          &copy; 2025 Trellis. All rights reserved.
        </p>
      </div>
    </footer>

  </div>
</template>

<style>
html { scroll-behavior: smooth; }

/* Fade-in on scroll */
.fade-up {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Subtle float animation for mockup cards */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.float-1 { animation: float 6s ease-in-out infinite; }
.float-2 { animation: float 6s ease-in-out 1s infinite; }
.float-3 { animation: float 6s ease-in-out 2s infinite; }

/* Showcase panel transitions */
.showcase-panel {
  animation: panelFade 0.35s ease;
}
@keyframes panelFade {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
