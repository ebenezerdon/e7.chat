import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const openai = createOpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN,
})

export async function GET() {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: 'You are a helpful AI assistant named "Ella".',
      prompt: 'Give a brief 2-sentence introduction of yourself',
    })

    return NextResponse.json({
      message: text,
    })
  } catch (error) {
    console.error('Error in test route:', error)
    return NextResponse.json(
      {
        error: 'An error occurred',
      },
      { status: 500 },
    )
  }
}
