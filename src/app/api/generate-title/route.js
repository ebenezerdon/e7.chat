import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenRouter client configuration
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer':
      process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
    'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'E7 Chat Assistant',
  },
})

export async function POST(req) {
  try {
    const { message } = await req.json()

    const response = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Use a cost-effective model for title generation
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates concise titles for conversations.',
        },
        {
          role: 'user',
          content: `Use this first message from a conversation to generate concise title without any quotes (max 5 words): "${message}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 20,
    })

    const title = response.choices[0]?.message?.content || 'New Chat'

    return NextResponse.json({ title })
  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 },
    )
  }
}
