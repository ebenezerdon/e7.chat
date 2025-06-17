import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenRouter client will be created per request to support user API keys

export async function POST(req) {
  try {
    const { message } = await req.json()

    // Check for user's API key
    const userApiKey = req.headers.get('X-User-API-Key')
    const apiKey = userApiKey || process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Create client with appropriate API key
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer':
          process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'E7 Chat Assistant',
      },
    })

    const response = await client.chat.completions.create({
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
