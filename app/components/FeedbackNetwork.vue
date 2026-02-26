<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Feedback Network
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Last 12 weeks
          </p>
        </div>
        <UIcon name="i-heroicons-share" class="text-teal-500 text-xl" />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-48">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-48 text-red-500">
      <p>Failed to load network data</p>
    </div>

    <div v-else-if="!network.connections.length && !network.gaps.length" class="flex flex-col items-center justify-center h-48 text-gray-400">
      <UIcon name="i-heroicons-chat-bubble-left-right" class="text-4xl mb-2" />
      <p class="text-sm">No feedback exchanges yet</p>
      <p class="text-xs mt-1">Start giving feedback to build your network</p>
    </div>

    <div v-else class="space-y-5">
      <!-- Connections -->
      <div v-if="network.connections.length">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Connections
        </p>
        <div class="space-y-3">
          <div
            v-for="person in network.connections"
            :key="person.userId"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-3 min-w-0">
              <UAvatar
                :src="person.avatarUrl || undefined"
                :alt="person.name"
                size="sm"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ person.name }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ formatRelativeDate(person.lastExchangeDate) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs shrink-0">
              <span class="text-green-600 dark:text-green-400" :title="`Given ${person.givenCount}`">
                <UIcon name="i-heroicons-arrow-up-right" class="inline -mt-0.5" />{{ person.givenCount }}
              </span>
              <span class="text-blue-600 dark:text-blue-400" :title="`Received ${person.receivedCount}`">
                <UIcon name="i-heroicons-arrow-down-left" class="inline -mt-0.5" />{{ person.receivedCount }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Gaps -->
      <div v-if="network.gaps.length">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          No recent exchanges
        </p>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="person in network.gaps"
            :key="person.userId"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <UAvatar
              :src="person.avatarUrl || undefined"
              :alt="person.name"
              size="3xs"
            />
            <span class="text-xs text-gray-600 dark:text-gray-400">{{ person.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

interface Connection {
  userId: string
  name: string
  avatarUrl: string | null
  givenCount: number
  receivedCount: number
  lastExchangeDate: string | null
}

interface Gap {
  userId: string
  name: string
  avatarUrl: string | null
}

interface NetworkData {
  connections: Connection[]
  gaps: Gap[]
}

const loading = ref(true)
const error = ref(false)
const network = ref<NetworkData>({
  connections: [],
  gaps: [],
})

function formatRelativeDate(date: string | null): string {
  if (!date) return ""
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/feedback/network')
    if (data) {
      network.value = data as NetworkData
    }
  } catch (e) {
    console.error('Failed to load feedback network:', e)
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>
