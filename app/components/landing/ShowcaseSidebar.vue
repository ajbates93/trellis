<script setup lang="ts">
interface NavItem {
  label: string
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

defineProps<{
  activeItem: string
  sections: NavSection[]
}>()
</script>

<template>
  <div class="hidden sm:flex w-40 bg-stone-800/80 flex-col p-3 gap-0.5 border-r border-stone-700/50 flex-shrink-0">
    <div class="flex items-center gap-2 mb-4">
      <TrellisLogo :size="18" />
      <span class="text-white text-xs font-bold">Trellis</span>
    </div>
    <template v-for="section in sections" :key="section.title">
      <div class="text-[9px] text-stone-500 font-semibold uppercase tracking-wider mb-1" :class="{ 'mt-2': section !== sections[0] }">
        {{ section.title }}
      </div>
      <div
        v-for="item in section.items"
        :key="item.label"
        class="text-[11px] whitespace-nowrap px-2 py-1.5"
        :class="item.label === activeItem
          ? 'text-[#06d6a0] font-semibold bg-[#10b981]/10 rounded-lg'
          : 'text-stone-400'"
      >
        {{ item.label }}
        <span v-if="item.badge" class="bg-[#10b981] text-white text-[8px] px-1 py-0.5 rounded-full ml-0.5">
          {{ item.badge }}
        </span>
      </div>
    </template>
  </div>
</template>
