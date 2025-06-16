import { createOpenAI } from '@ai-sdk/openai'

export const maxDuration = 60

export async function POST(req) {
  try {
    const {
      prompt,
      size = '1024x1024',
      quality = 'standard',
    } = await req.json()

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Use OpenAI's client directly for image generation
    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: size,
          quality: quality,
          response_format: 'url',
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API Error:', error)
      return Response.json(
        { error: error.error?.message || 'Failed to generate image' },
        { status: response.status },
      )
    }

    const data = await response.json()

    return Response.json({
      imageUrl: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
