import { createOpenAI } from '@ai-sdk/openai'
import { streamText, smoothStream } from 'ai'

export const maxDuration = 30

export async function POST(req) {
  const { messages } = await req.json()

  const openai = createOpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: process.env.GITHUB_TOKEN,
  })

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpful assistant named Lexi.',
    messages,
    experimental_transform: smoothStream(),
  })

  return result.toDataStreamResponse()
}
