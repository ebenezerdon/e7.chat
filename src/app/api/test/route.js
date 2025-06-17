import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenRouter client configuration
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer':
      process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
    'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'e7.chat',
  },
})

export async function GET() {
  try {
    const response = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant named "Lexi".',
        },
        {
          role: 'user',
          content: 'Give a brief 2-sentence introduction of yourself',
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    const message =
      response.choices[0]?.message?.content ||
      'Hello! I am Lexi, your AI assistant.'

    return NextResponse.json({
      message,
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
