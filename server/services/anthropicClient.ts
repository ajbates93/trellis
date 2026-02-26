import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Type definitions for analysis results
export interface FeedbackTheme {
  theme: string
  count: number
  sentiment: 'positive' | 'constructive' | 'neutral'
  confidence: number
  keywords: string[]
  feedbackIds: string[]
}

export interface SuggestedGoal {
  goalText: string
  basedOnTheme: string
  confidence: number
  dismissed?: boolean
  actedUpon?: boolean
}

export interface SentimentData {
  positive: number
  constructive: number
  neutral: number
}

export interface AnalysisResult {
  themes: FeedbackTheme[]
  suggestedGoals: SuggestedGoal[]
  sentimentData: SentimentData
  overallSentiment: 'positive' | 'neutral' | 'constructive' | 'mixed'
}

export interface FeedbackItem {
  id: string
  content: string
  createdAt: Date
  reviewer: {
    name: string
  }
}

/**
 * Analyze feedback using Claude 3.5 Haiku to identify themes, sentiment, and goal suggestions
 * @param feedbackItems - Array of feedback items to analyze
 * @param userName - Name of the user receiving the feedback (for context)
 * @returns Structured analysis results
 */
export async function analyzeFeedback(
  feedbackItems: FeedbackItem[],
  userName: string
): Promise<AnalysisResult> {
  if (feedbackItems.length === 0) {
    throw new Error('No feedback items provided for analysis')
  }

  // Construct the prompt for Claude
  const feedbackCount = feedbackItems.length
  const feedbackList = feedbackItems
    .map((f, i) => `${i + 1}. From ${f.reviewer.name}: "${f.content}"`)
    .join('\n')

  const prompt = `Analyze the following ${feedbackCount} pieces of feedback received by ${userName} and identify:

1. **Recurring Themes** (top 3-5 themes):
   - Theme name (2-4 words, capitalized)
   - Count (how many feedback items mention this)
   - Sentiment (positive, constructive, or neutral)
   - Confidence score (0.0-1.0)
   - Key keywords associated with theme (3-5 words)
   - Feedback IDs that contain this theme

2. **Suggested Goals** (1-2 actionable goals):
   - Specific, actionable goal text (1-2 sentences, under 100 characters)
   - Which theme it addresses
   - Confidence score (0.0-1.0)

3. **Sentiment Distribution**:
   - Percentage breakdown (must sum to 100): positive, constructive, neutral

4. **Overall Sentiment**:
   - positive | neutral | constructive | mixed

Return ONLY valid JSON matching this exact schema:
{
  "themes": [
    {
      "theme": "Client Communication",
      "count": 8,
      "sentiment": "constructive",
      "confidence": 0.85,
      "keywords": ["communication", "client", "updates", "meetings"],
      "feedbackIds": ["${feedbackItems[0]?.id || 'example-id'}"]
    }
  ],
  "suggestedGoals": [
    {
      "goalText": "Improve client communication by scheduling weekly update meetings",
      "basedOnTheme": "Client Communication",
      "confidence": 0.80
    }
  ],
  "sentimentData": {
    "positive": 60,
    "constructive": 30,
    "neutral": 10
  },
  "overallSentiment": "constructive"
}

Feedback items (${feedbackCount}):
${feedbackList}

Important guidelines:
- Be specific in theme names (avoid generic terms like "Work Quality")
- Ensure sentiment percentages sum to exactly 100
- Keep goal suggestions concise and actionable
- Match feedbackIds to actual IDs provided
- Focus on patterns, not individual feedback items

Return JSON:`

  try {
    // Call Claude 3.5 Haiku
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract the response text
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // Parse JSON response
    const analysisResult = parseAnalysisResponse(responseText, feedbackItems)

    return analysisResult
  } catch (error) {
    console.error('Error analyzing feedback with Anthropic:', error)
    throw new Error(
      `Failed to analyze feedback: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Parse and validate the Claude response
 * @param responseText - Raw text response from Claude
 * @param feedbackItems - Original feedback items for validation
 * @returns Validated analysis result
 */
function parseAnalysisResponse(
  responseText: string,
  feedbackItems: FeedbackItem[]
): AnalysisResult {
  try {
    // Try to extract JSON from the response (Claude might add extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate required fields
    if (!parsed.themes || !Array.isArray(parsed.themes)) {
      throw new Error('Missing or invalid themes array')
    }
    if (!parsed.suggestedGoals || !Array.isArray(parsed.suggestedGoals)) {
      throw new Error('Missing or invalid suggestedGoals array')
    }
    if (!parsed.sentimentData || typeof parsed.sentimentData !== 'object') {
      throw new Error('Missing or invalid sentimentData')
    }

    // Normalize sentiment percentages to ensure they sum to 100
    const { positive, constructive, neutral } = parsed.sentimentData
    const total = positive + constructive + neutral

    const normalizedSentimentData: SentimentData = {
      positive: Math.round((positive / total) * 100),
      constructive: Math.round((constructive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
    }

    // Adjust for rounding errors to ensure exact 100%
    const sum = normalizedSentimentData.positive + normalizedSentimentData.constructive + normalizedSentimentData.neutral
    if (sum !== 100) {
      normalizedSentimentData.positive += (100 - sum)
    }

    // Map feedback IDs to ensure they're valid UUIDs from our actual feedback
    const validFeedbackIds = new Set(feedbackItems.map(f => f.id))
    const themes: FeedbackTheme[] = parsed.themes.map((theme: any) => ({
      ...theme,
      feedbackIds: theme.feedbackIds?.filter((id: string) => validFeedbackIds.has(id)) || [],
    }))

    return {
      themes,
      suggestedGoals: parsed.suggestedGoals,
      sentimentData: normalizedSentimentData,
      overallSentiment: parsed.overallSentiment || 'mixed',
    }
  } catch (error) {
    console.error('Error parsing analysis response:', error)
    console.error('Response text:', responseText)
    throw new Error(
      `Failed to parse analysis response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get a summary of recent analysis for display purposes
 * @param analysisResult - The full analysis result
 * @returns Human-readable summary text
 */
export function getAnalysisSummary(analysisResult: AnalysisResult): string {
  const topThemes = analysisResult.themes
    .slice(0, 3)
    .map(t => t.theme)
    .join(', ')

  const sentimentType = analysisResult.overallSentiment

  return `Overall sentiment: ${sentimentType}. Key themes: ${topThemes}.`
}
