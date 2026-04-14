import type { SentimentData, FeedbackTheme, SuggestedGoal } from '../../server/services/anthropicClient'

interface InsightsData {
  sentimentData: SentimentData
  themes: FeedbackTheme[]
  suggestedGoals: SuggestedGoal[]
}

interface InsightsSummary {
  hasAnalysis: boolean
  lastAnalyzed: Date | null
  feedbackCount: number
  newFeedbackSinceAnalysis: number
  data: InsightsData | null
  message?: string
}

interface AnalyzeResponse {
  status: 'cached' | 'completed'
  message: string
  lastAnalyzed: Date
  data: InsightsData
}

export const useFeedbackInsights = () => {
  const toast = useToast()
  const isAnalyzing = ref(false)

  // Fetch cached insights summary
  const { data: insightsSummary, refresh: refreshInsights } = useApi<InsightsSummary>(
    '/insights/user-summary',
    {
      key: 'feedback-insights-summary',
      // Don't auto-fetch on server to avoid initial load issues
      server: false,
    }
  )

  // Computed properties for easy access
  const hasAnalysis = computed(() => insightsSummary.value?.hasAnalysis || false)
  const lastAnalyzed = computed(() => insightsSummary.value?.lastAnalyzed || null)
  const feedbackCount = computed(() => insightsSummary.value?.feedbackCount || 0)
  const newFeedbackCount = computed(() => insightsSummary.value?.newFeedbackSinceAnalysis || 0)
  const sentimentData = computed(() => insightsSummary.value?.data?.sentimentData || null)
  const summary = computed(() => insightsSummary.value?.data?.sentimentData?.summary || null)
  const themes = computed(() => insightsSummary.value?.data?.themes || [])
  const suggestedGoals = computed(() => insightsSummary.value?.data?.suggestedGoals || [])

  // Also fetch total published feedback count for users who haven't analyzed yet
  const { data: totalFeedbackData } = useApi('/feedback/received')
  const totalPublishedFeedback = computed(() => {
    if (hasAnalysis.value) {
      return feedbackCount.value
    }
    return totalFeedbackData.value?.feedback?.filter((f: any) => f.isPublished !== false).length || 0
  })

  // Calculate days since last analysis
  const daysSinceAnalysis = computed(() => {
    if (!lastAnalyzed.value) return null
    const now = new Date()
    const analyzed = new Date(lastAnalyzed.value)
    const diffTime = Math.abs(now.getTime() - analyzed.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  })

  // Check if user can analyze (not analyzed in last 24 hours)
  const canAnalyze = computed(() => {
    if (!lastAnalyzed.value) return true
    const daysSince = daysSinceAnalysis.value
    return daysSince !== null && daysSince >= 1
  })

  // Trigger new analysis
  const analyzeFeedback = async () => {
    if (isAnalyzing.value) {
      toast.add({
        title: 'Analysis in progress',
        description: 'Please wait for the current analysis to complete',
        color: 'warning',
      })
      return
    }

    if (!canAnalyze.value) {
      toast.add({
        title: 'Analysis recently completed',
        description: 'You can analyze again tomorrow',
        color: 'warning',
      })
      return
    }

    isAnalyzing.value = true

    try {
      const response = await $api<AnalyzeResponse>('/insights/analyze', {
        method: 'POST',
      })

      if (response.status === 'cached') {
        toast.add({
          title: 'Using recent analysis',
          description: 'Showing your most recent feedback insights',
          color: 'primary',
        })
      } else {
        toast.add({
          title: 'Analysis complete!',
          description: `Analyzed ${feedbackCount.value} pieces of feedback`,
          color: 'success',
        })
      }

      // Refresh the insights summary
      await refreshInsights()
    } catch (error: any) {
      console.error('Error analyzing feedback:', error)

      // Handle specific error cases
      if (error.statusCode === 400) {
        toast.add({
          title: 'Not enough feedback',
          description: error.data?.message || 'You need at least 3 pieces of feedback to analyze',
          color: 'error',
        })
      } else if (error.statusCode === 401) {
        toast.add({
          title: 'Authentication required',
          description: 'Please log in to analyze feedback',
          color: 'error',
        })
      } else {
        toast.add({
          title: 'Analysis failed',
          description: 'Failed to analyze feedback. Please try again later.',
          color: 'error',
        })
      }
    } finally {
      isAnalyzing.value = false
    }
  }

  return {
    // Data
    insightsSummary,
    hasAnalysis,
    lastAnalyzed,
    feedbackCount,
    totalPublishedFeedback,
    newFeedbackCount,
    sentimentData,
    summary,
    themes,
    suggestedGoals,
    daysSinceAnalysis,
    canAnalyze,
    isAnalyzing,

    // Actions
    analyzeFeedback,
    refreshInsights,
  }
}
