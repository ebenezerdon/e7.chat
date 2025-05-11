import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const openai = createOpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN,
})

export async function POST(req) {
  try {
    const { message } = await req.json()
    const { text } = await generateText({
      model: openai('gpt-4o'),
      system:
        'You are a helpful assistant that generates concise titles for conversations.',
      prompt: `Use this first message from a conversation to generate concise title
        without any quotes (max 5 words): "${message}"`,
    })

    return NextResponse.json({ title: text })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 },
    )
  }
}
