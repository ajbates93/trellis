<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'

useHead({
  title: 'Trellis | Peer feedback that grows your team',
  meta: [
    {
      name: 'description',
      content: 'Trellis is the peer feedback platform that helps teams give meaningful feedback, track goals, and grow together. Built for modern teams.',
    },
  ],
})

definePageMeta({
  layout: false,
  colorMode: 'light',
})

// Showcase panel state
const activePanel = ref<'submit' | 'inbox' | 'goals' | 'insights'>('submit')

// Fade-up animation via IntersectionObserver
const fadeUpElements = ref<HTMLElement[]>([])

function setFadeUpRef(el: any) {
  if (el) fadeUpElements.value.push(el)
}

onMounted(() => {
  fadeUpElements.value.forEach((el) => {
    useIntersectionObserver(el, (entries) => {
      if (entries[0]?.isIntersecting) el.classList.add('visible')
    }, { threshold: 0.1 })
  })
})

// Showcase sidebar nav configs
const defaultSidebarSections = [
  {
    title: 'Personal',
    items: [
      { label: 'Submit' },
      { label: 'Brag Bucket' },
      { label: 'Insights' },
      { label: 'Feedback' },
      { label: 'Goals' },
    ],
  },
  {
    title: 'Buddy',
    items: [
      { label: 'Buddies' },
      { label: 'Feedback' },
    ],
  },
]

const inboxSidebarSections = [
  {
    title: 'Personal',
    items: [
      { label: 'Submit' },
      { label: 'Brag Bucket' },
      { label: 'Insights' },
      { label: 'Feedback', badge: '3' },
      { label: 'Goals' },
    ],
  },
  {
    title: 'Buddy',
    items: [
      { label: 'Buddies' },
      { label: 'Feedback' },
    ],
  },
]

const insightsSidebarSections = [
  {
    title: 'Admin',
    items: [
      { label: 'Insights' },
      { label: 'Team Members' },
      { label: 'Feedback Logs' },
      { label: 'Settings' },
    ],
  },
]

// Features data
const features = [
  {
    icon: 'i-heroicons-chat-bubble-oval-left-ellipsis',
    title: 'Weekly Peer Feedback',
    description: 'Lightweight weekly check-ins make feedback a habit, not an event. One review per person per week keeps things consistent and low-pressure.',
  },
  {
    icon: 'i-heroicons-user-group',
    title: 'Buddy System',
    description: 'Pair everyone with a buddy who reviews, publishes, and supports their growth. Buddies see all feedback and help turn it into action.',
  },
  {
    icon: 'i-heroicons-check-circle',
    title: 'Goal Tracking',
    description: 'Set personal development goals with milestones and deadlines. Track progress over time and connect goals directly to the feedback you receive.',
  },
  {
    icon: null,
    emoji: '🌱',
    title: 'Trellis Garden',
    description: 'A living visualisation of your team\'s feedback health. Watch your garden grow from wilting to thriving as your team builds the feedback habit.',
  },
  {
    icon: 'i-heroicons-chart-bar',
    title: 'Insights & Analytics',
    description: 'Sentiment analysis, engagement trends, and contribution leaderboards. Admins get a clear picture of team health at a glance.',
  },
  {
    icon: 'i-heroicons-users',
    title: 'Easy Team Setup',
    description: 'Import your team via CSV, assign buddies, and go. Invitation-based access means your people see their relationships from the moment they log in.',
  },
]

// Showcase tabs config
const showcaseTabs = [
  {
    id: 'submit' as const,
    icon: 'i-heroicons-paper-airplane',
    title: 'Submit Feedback',
    description: 'Pick a colleague, write a short note about their work, and submit. Guided prompts help you write useful, specific feedback in under two minutes.',
  },
  {
    id: 'inbox' as const,
    icon: 'i-heroicons-inbox',
    title: 'Feedback Inbox',
    description: 'See all the feedback you\'ve received in one place. Filter by read, unread, or given. Your buddy reviews and publishes new feedback for you.',
  },
  {
    id: 'goals' as const,
    icon: 'i-heroicons-check-circle',
    title: 'Track Goals',
    description: 'Set development goals with milestones and target dates. Progress bars keep you honest, and your buddy can see how you\'re tracking.',
  },
  {
    id: 'insights' as const,
    icon: 'i-heroicons-chart-bar',
    title: 'Team Insights',
    description: 'Admins get a bird\'s-eye view of team engagement, sentiment trends, and who\'s contributing. Data you can act on, not just look at.',
  },
]
</script>

<template>
  <div class="bg-stone-50 text-[#022c22] antialiased">
    <!-- NAVBAR -->
    <nav class="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200/60">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" class="flex items-center gap-2.5">
          <TrellisLogo :size="32" />
          <span class="text-xl font-bold tracking-tight text-[#064e3b]">Trellis</span>
        </a>

        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-[#065f46]">
          <a href="#features" class="hover:text-[#059669] transition-colors">Features</a>
          <a href="#how-it-works" class="hover:text-[#059669] transition-colors">How It Works</a>
          <a href="#integrations" class="hover:text-[#059669] transition-colors">Integrations</a>
        </div>

        <div class="flex items-center gap-3">
          <a
            href="#cta"
            class="hidden sm:inline-flex items-center gap-2 bg-[#064e3b] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#065f46] transition-colors"
          >
            Book a Demo
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
          </a>
        </div>
      </div>
    </nav>

    <!-- HERO - Bento Grid -->
    <section class="max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-24">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Headline card -->
        <div class="lg:col-span-5 bg-[#d1fae5] rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-[340px]">
          <div>
            <h1 class="text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight text-[#022c22]">
              Better feedback.<br>Stronger teams.
            </h1>
            <p class="mt-5 text-lg text-[#065f46]/80 leading-relaxed max-w-md">
              Give your team a simple, structured way to share peer feedback, track goals, and grow together. Every week.
            </p>
          </div>
        </div>

        <!-- Product mockup card -->
        <div
          class="lg:col-span-7 bg-stone-100 border border-stone-200/80 rounded-3xl p-6 md:p-8 pb-10 md:pb-12 relative overflow-hidden min-h-[340px]"
          style="background: linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #f5f5f4 100%)"
        >
          <div class="relative w-full h-full flex items-center justify-center gap-4">
            <LandingHeroFeedbackCard class="float-1" />
            <LandingHeroDashboardCard class="float-2" />
            <LandingHeroGoalsCard class="float-3" />
          </div>

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
          <UIcon name="i-heroicons-arrow-right" class="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
        </div>

        <!-- Stat card -->
        <div class="lg:col-span-7 bg-[#064e3b] rounded-3xl p-6 md:p-8 flex items-center gap-6">
          <div class="text-4xl md:text-5xl font-extrabold text-[#06d6a0] leading-none">4.6&times;</div>
          <div>
            <p class="text-white font-semibold text-sm md:text-base">more likely to feel engaged at work</p>
            <p class="text-[#a7f3d0] text-xs mt-1">Employees who receive regular feedback are significantly more engaged than those who don't. <span class="text-[#6ee7b7]">&mdash; Gallup</span></p>
          </div>
        </div>
      </div>

      <!-- Built by Pocketworks -->
      <div class="mt-6 text-xs text-stone-400">
        Built by <a href="https://pocketworks.co.uk" target="_blank" class="font-semibold text-[#F99F53] hover:underline">Pocketworks</a> · Trusted by teams who care about growth
      </div>
    </section>

    <!-- THE PROBLEM -->
    <section :ref="setFadeUpRef" class="max-w-7xl mx-auto px-6 py-16 md:py-24 fade-up">
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

    <!-- FEATURES - Bento Grid -->
    <section id="features" class="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
      <div :ref="setFadeUpRef" class="fade-up mb-12">
        <span class="inline-block bg-[#d1fae5] text-[#047857] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">The solution</span>
        <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-[#022c22]">Everything your team needs to grow</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          :ref="setFadeUpRef"
          class="fade-up bg-white border border-stone-200 rounded-3xl p-7 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300"
        >
          <div class="w-11 h-11 rounded-2xl bg-[#d1fae5] flex items-center justify-center mb-5">
            <span v-if="feature.emoji" class="text-xl">{{ feature.emoji }}</span>
            <UIcon v-else :name="feature.icon!" class="w-5 h-5 text-[#059669]" />
          </div>
          <h3 class="text-lg font-bold text-[#064e3b] mb-2">{{ feature.title }}</h3>
          <p class="text-sm text-stone-600 leading-relaxed">{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- PRODUCT SHOWCASE - Interactive Panels -->
    <section class="max-w-7xl mx-auto px-6 py-16 md:py-24">
      <div :ref="setFadeUpRef" class="fade-up mb-12">
        <span class="inline-block bg-[#d1fae5] text-[#047857] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">See it in action</span>
        <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-[#022c22]">Built to make feedback easy</h2>
      </div>

      <div :ref="setFadeUpRef" class="fade-up grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Tabs -->
        <div class="lg:col-span-4 flex flex-col gap-3">
          <button
            v-for="tab in showcaseTabs"
            :key="tab.id"
            class="text-left rounded-2xl p-5 border-2 transition-all duration-300"
            :class="activePanel === tab.id
              ? 'border-[#10b981] bg-[#ecfdf5]'
              : 'border-stone-200 bg-white hover:border-stone-300'"
            @click="activePanel = tab.id"
          >
            <div class="flex items-center gap-3 mb-2">
              <div
                class="w-8 h-8 rounded-xl flex items-center justify-center"
                :class="activePanel === tab.id ? 'bg-[#d1fae5]' : 'bg-stone-100'"
              >
                <UIcon
                  :name="tab.icon"
                  class="w-4 h-4"
                  :class="activePanel === tab.id ? 'text-[#059669]' : 'text-stone-500'"
                />
              </div>
              <h3
                class="font-bold"
                :class="activePanel === tab.id ? 'text-[#064e3b]' : 'text-stone-700'"
              >
                {{ tab.title }}
              </h3>
            </div>
            <p
              class="text-sm leading-relaxed"
              :class="activePanel === tab.id ? 'text-stone-600' : 'text-stone-500'"
            >
              {{ tab.description }}
            </p>
          </button>
        </div>

        <!-- Mockup Panel -->
        <div class="lg:col-span-8 lg:sticky lg:top-20 lg:self-start">
          <div class="bg-stone-900 rounded-2xl overflow-hidden shadow-2xl shadow-stone-900/20">
            <!-- Window chrome -->
            <div class="flex items-center gap-2 px-4 py-3 bg-stone-800">
              <div class="w-3 h-3 rounded-full bg-stone-600" />
              <div class="w-3 h-3 rounded-full bg-stone-600" />
              <div class="w-3 h-3 rounded-full bg-stone-600" />
            </div>

            <!-- Panel: Submit Feedback -->
            <Transition name="panel">
              <div v-if="activePanel === 'submit'" key="submit" class="flex min-h-[420px]">
                <LandingShowcaseSidebar active-item="Submit" :sections="defaultSidebarSections" />
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Submit Feedback</h3>
                  <p class="text-stone-400 text-xs mb-5">Share feedback with a colleague</p>

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

                  <div class="bg-[#064e3b]/20 border border-[#10b981]/20 rounded-xl p-3 flex items-center gap-2 mb-4">
                    <UIcon name="i-heroicons-light-bulb" class="w-4 h-4 text-[#06d6a0] flex-shrink-0" />
                    <span class="text-[#06d6a0] text-xs">What's one thing this person should definitely keep doing?</span>
                  </div>

                  <div class="bg-stone-800 border border-stone-700 rounded-xl p-3 h-24 mb-3">
                    <span class="text-stone-500 text-xs">What have you noticed about their work recently? Be specific...</span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-stone-600 text-[10px]">0 characters (minimum 10)</span>
                    <button class="bg-[#10b981] text-white text-xs font-semibold px-4 py-2 rounded-lg">Submit Feedback</button>
                  </div>
                </div>
              </div>
            </Transition>

            <!-- Panel: Feedback Inbox -->
            <Transition name="panel">
              <div v-if="activePanel === 'inbox'" key="inbox" class="flex min-h-[420px]">
                <LandingShowcaseSidebar active-item="Feedback" :sections="inboxSidebarSections" />
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Feedback Inbox</h3>
                  <p class="text-stone-400 text-xs mb-5">View and manage your feedback</p>

                  <div class="flex bg-stone-800 rounded-xl p-1 mb-5 text-xs font-semibold">
                    <div class="flex-1 text-center py-2 bg-stone-700 rounded-lg text-white">Received <span class="bg-stone-600 text-stone-300 px-1.5 py-0.5 rounded text-[10px] ml-1">8</span></div>
                    <div class="flex-1 text-center py-2 text-stone-400">Unread <span class="text-[10px] ml-1">3</span></div>
                    <div class="flex-1 text-center py-2 text-stone-400">Given <span class="text-[10px] ml-1">36</span></div>
                  </div>

                  <div class="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-2">Recent Feedback</div>
                  <div class="grid grid-cols-3 gap-2.5 mb-5">
                    <div v-for="person in [
                      { initial: 'R', name: 'Rory', color: 'bg-blue-600', time: '28d ago', text: 'Test coverage has been slipping lately. Would be good to prioritize writing tests...' },
                      { initial: 'M', name: 'Marcin', color: 'bg-purple-600', time: '1mo ago', text: 'Never cuts corners. Always delivers polished, production-ready work.' },
                      { initial: 'A', name: 'Ava', color: 'bg-orange-600', time: '2mo ago', text: 'Design thinking is on point. Love how you solve for edge cases.' },
                    ]" :key="person.name" class="bg-stone-800 border border-stone-700 rounded-xl p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <div :class="[person.color, 'w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold']">{{ person.initial }}</div>
                        <span class="text-white text-xs font-semibold">{{ person.name }}</span>
                        <span class="text-stone-600 text-[9px] ml-auto">{{ person.time }}</span>
                      </div>
                      <p class="text-stone-400 text-[10px] leading-relaxed">{{ person.text }}</p>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-[9px] text-[#06d6a0] bg-[#10b981]/10 px-1.5 py-0.5 rounded font-medium">Read</span>
                        <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 text-stone-600" />
                      </div>
                    </div>
                  </div>

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
            </Transition>

            <!-- Panel: Goals -->
            <Transition name="panel">
              <div v-if="activePanel === 'goals'" key="goals" class="flex min-h-[420px]">
                <LandingShowcaseSidebar active-item="Goals" :sections="defaultSidebarSections" />
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Track Goals</h3>
                  <p class="text-stone-400 text-xs mb-5">Set and manage your development goals</p>

                  <div
                    v-for="(goal, i) in [
                      { title: 'Improve code review timeliness', subtitle: 'Target: 24 hours', progress: 65, status: 'Active', statusColor: 'bg-[#10b981]/20 text-[#06d6a0]', barColor: 'bg-[#10b981]', note: '65% progress · Est. completion in 2 weeks' },
                      { title: 'Mentoring: Junior developers', subtitle: 'Milestone: Review 2 PRs per week', progress: 40, status: 'Active', statusColor: 'bg-[#10b981]/20 text-[#06d6a0]', barColor: 'bg-[#06d6a0]', note: '40% progress · Last updated 3 days ago' },
                      { title: 'Public speaking: Team talks', subtitle: 'Target: 1 talk per quarter', progress: 15, status: 'Planning', statusColor: 'bg-blue-500/20 text-blue-300', barColor: 'bg-blue-500', note: '15% progress · Not started yet' },
                    ]"
                    :key="goal.title"
                    class="bg-stone-800 border border-stone-700 rounded-xl p-4"
                    :class="{ 'mb-3': i < 2 }"
                  >
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="text-white text-sm font-semibold">{{ goal.title }}</h4>
                        <p class="text-stone-500 text-[10px] mt-1">{{ goal.subtitle }}</p>
                      </div>
                      <span :class="[goal.statusColor, 'text-[9px] px-2 py-1 rounded-full font-medium']">{{ goal.status }}</span>
                    </div>
                    <div class="bg-stone-900 rounded-full h-2">
                      <div :class="[goal.barColor, 'h-2 rounded-full']" :style="{ width: `${goal.progress}%` }" />
                    </div>
                    <p class="text-stone-500 text-[10px] mt-2">{{ goal.note }}</p>
                  </div>
                </div>
              </div>
            </Transition>

            <!-- Panel: Insights -->
            <Transition name="panel">
              <div v-if="activePanel === 'insights'" key="insights" class="flex min-h-[420px]">
                <LandingShowcaseSidebar active-item="Insights" :sections="insightsSidebarSections" />
                <div class="flex-1 p-6">
                  <h3 class="text-white font-bold text-lg mb-1">Team Insights</h3>
                  <p class="text-stone-400 text-xs mb-5">Your team's engagement and health metrics</p>

                  <div class="grid grid-cols-3 gap-3 mb-5">
                    <div v-for="stat in [
                      { label: 'Feedback given', value: '342', note: 'This month' },
                      { label: 'Avg per person', value: '11.4', note: 'Very healthy' },
                      { label: 'Team health', value: '87%', note: 'On track' },
                    ]" :key="stat.label" class="bg-stone-800 rounded-xl p-3 text-center">
                      <p class="text-stone-500 text-[9px] uppercase tracking-wider font-semibold">{{ stat.label }}</p>
                      <p class="text-white text-2xl font-extrabold mt-1">{{ stat.value }}</p>
                      <p class="text-stone-500 text-[9px] mt-1">{{ stat.note }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="text-stone-500 text-[10px] uppercase tracking-wider font-semibold mb-2">Top contributors this month</p>
                    <div class="space-y-2">
                      <div
                        v-for="contributor in [
                          { initial: 'S', name: 'Sarah M.', color: 'bg-blue-600', count: 42 },
                          { initial: 'M', name: 'Marcin', color: 'bg-purple-600', count: 38 },
                          { initial: 'J', name: 'James P.', color: 'bg-green-600', count: 35 },
                        ]"
                        :key="contributor.name"
                        class="flex items-center justify-between text-xs"
                      >
                        <div class="flex items-center gap-2">
                          <div :class="[contributor.color, 'w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold']">{{ contributor.initial }}</div>
                          <span class="text-white font-medium">{{ contributor.name }}</span>
                        </div>
                        <span class="text-[#06d6a0] font-semibold">{{ contributor.count }} feedback</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA SECTION -->
    <section id="cta" :ref="setFadeUpRef" class="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center fade-up">
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

    <!-- FOOTER -->
    <footer class="border-t border-stone-200/60 bg-stone-50/50 py-8 text-center">
      <div class="max-w-7xl mx-auto px-6">
        <p class="text-sm text-stone-600">
          Built by <a href="https://pocketworks.co.uk" target="_blank" class="font-semibold text-[#F99F53] hover:underline">Pocketworks</a> for teams who care about growth
        </p>
        <p class="text-xs text-stone-500 mt-4">
          &copy; 2026 Trellis. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
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

:deep(.float-1) { animation: float 6s ease-in-out infinite; }
:deep(.float-2) { animation: float 6s ease-in-out 1s infinite; }
:deep(.float-3) { animation: float 6s ease-in-out 2s infinite; }

/* Showcase panel transitions */
.panel-enter-active {
  animation: panelFade 0.35s ease;
}

.panel-leave-active {
  display: none;
}

@keyframes panelFade {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
