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

    // Check for user's OpenAI API key in headers
    const userApiKey = req.headers.get('X-User-API-Key')
    const apiKey = userApiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return Response.json(
        {
          error: 'OpenAI API key is required. Please add your OpenAI API key.',
        },
        { status: 401 },
      )
    }

    const openai = createOpenAI({
      apiKey: apiKey,
    })

    // Use DALL-E 3 for image generation
    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          size: size,
          quality: quality === 'auto' ? 'standard' : quality,
          response_format: 'url',
          n: 1,
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

    // DALL-E 3 returns image URLs
    const imageUrl = data.data[0].url

    return Response.json({
      imageUrl: imageUrl,
      revisedPrompt: data.data[0].revised_prompt || prompt,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
