import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export const maxDuration = 60

// Create OpenRouter provider factory
const createOpenRouterProvider = (apiKey) =>
  createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    headers: {
      'HTTP-Referer':
        process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
      'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'e7.chat',
    },
  })

// Curated list of valuable models with concise descriptions
const CURATED_MODELS = {
  // OpenAI Models - Most popular and reliable
  openai: {
    name: 'OpenAI',
    models: {
      'openai/gpt-4o': {
        name: 'GPT-4o',
        description: 'Most capable model',
        pricing: '$5/M tokens',
        featured: true,
      },
      'openai/gpt-4o-mini': {
        name: 'GPT-4o Mini',
        description: 'Fast & affordable',
        pricing: '$0.15/M tokens',
        featured: true,
      },
      'openai/o1-preview': {
        name: 'o1 Preview',
        description: 'Advanced reasoning',
        pricing: '$15/M tokens',
      },
      'openai/o1-mini': {
        name: 'o1 Mini',
        description: 'Reasoning on a budget',
        pricing: '$3/M tokens',
      },
    },
  },

  // Anthropic Models - Great for analysis and writing
  anthropic: {
    name: 'Anthropic',
    models: {
      'anthropic/claude-3.5-sonnet': {
        name: 'Claude 3.5 Sonnet',
        description: 'Best for coding & analysis',
        pricing: '$3/M tokens',
        featured: true,
      },
      'anthropic/claude-3.5-haiku': {
        name: 'Claude 3.5 Haiku',
        description: 'Fastest Claude model',
        pricing: '$1/M tokens',
      },
      'anthropic/claude-3-opus': {
        name: 'Claude 3 Opus',
        description: 'Most intelligent Claude',
        pricing: '$15/M tokens',
      },
    },
  },

  // Google Models - Great for specific tasks
  google: {
    name: 'Google',
    models: {
      'google/gemini-pro-1.5': {
        name: 'Gemini 1.5 Pro',
        description: 'Large context window',
        pricing: '$2.50/M tokens',
      },
      'google/gemini-flash-1.5': {
        name: 'Gemini 1.5 Flash',
        description: 'Speed optimized',
        pricing: '$0.15/M tokens',
        featured: true,
      },
    },
  },

  // Alternative Models - Good value options
  alternatives: {
    name: 'Alternatives',
    models: {
      'meta-llama/llama-3.1-405b-instruct': {
        name: 'Llama 3.1 405B',
        description: 'Open source flagship',
        pricing: '$2.70/M tokens',
      },
      'deepseek/deepseek-chat': {
        name: 'DeepSeek Chat',
        description: 'Great value coding',
        pricing: '$0.14/M tokens',
        featured: true,
      },
      'qwen/qwen-2.5-72b-instruct': {
        name: 'Qwen 2.5 72B',
        description: 'Multilingual excellence',
        pricing: '$0.40/M tokens',
      },
      'mistralai/mistral-large': {
        name: 'Mistral Large',
        description: 'European AI leader',
        pricing: '$2/M tokens',
      },
    },
  },
}

function validateRequest(body, apiKey) {
  const { messages, model } = body

  if (!messages || !Array.isArray(messages)) {
    throw new Error('Messages array is required')
  }

  if (!apiKey) {
    throw new Error(
      'OpenRouter API key not configured. Please add your own API key or ensure the server API key is set.',
    )
  }

  return { messages, model: model || 'openai/gpt-4o-mini' }
}

function createErrorResponse(error, status = 500) {
  const errorMap = {
    'API key': {
      message: 'Invalid or missing OpenRouter API key',
      status: 401,
    },
    'rate limit': {
      message: 'Rate limit exceeded. Please try again later',
      status: 429,
    },
    quota: {
      message: 'Rate limit exceeded. Please try again later',
      status: 429,
    },
  }

  for (const [key, config] of Object.entries(errorMap)) {
    if (error.message?.toLowerCase().includes(key)) {
      return Response.json({ error: config.message }, { status: config.status })
    }
  }

  return Response.json(
    { error: error.message || 'Internal server error' },
    { status },
  )
}

export async function POST(req) {
  try {
    const body = await req.json()

    // Check for user's API key first
    const userApiKey = req.headers.get('X-User-API-Key')
    const apiKey = userApiKey || process.env.OPENROUTER_API_KEY

    const { messages, model } = validateRequest(body, apiKey)
    const { settings = {} } = body

    // Server-side API key restriction: only allow gpt-4o-mini without user API key
    if (!userApiKey && model !== 'openai/gpt-4o-mini') {
      return Response.json(
        {
          error:
            'This model requires your own OpenRouter API key. Please add your API key or use GPT-4o Mini.',
          requiresApiKey: true,
          allowedModel: 'openai/gpt-4o-mini',
        },
        { status: 403 },
      )
    }

    // Create provider with the appropriate API key
    const openrouter = createOpenRouterProvider(apiKey)

    const result = streamText({
      model: openrouter(model),
      system: `You are Lexi, a helpful AI assistant powering e7.chat.

About e7.chat:
e7.chat is an innovative open-source alternative to ChatGPT, developed by Ebenezer Don - the creator of NextJob.work (https://nextjob.work - a platform for managing your job applications, generating tailored resumes, cover letters, custom interview prep, and other AI features) and author of "Simplified JavaScript for VIPs", "Git Prodigy", and "The Art of Asking Better Questions (for Humans and AI)".

e7.chat features:
- 🤖 Multi-AI Model Support: Access to 100+ AI models via OpenRouter integration (OpenAI GPT, Anthropic Claude, Google Gemini, Meta Llama, DeepSeek, and many more)
- 🔐 Multiple Authentication Methods: Email/password and OAuth (Google, GitHub)
- 📱 Responsive Design: Works seamlessly on desktop and mobile
- 💾 Cloud Sync: Chat history synchronized across devices
- 🔗 Chat Sharing: Share conversations with public links
- 🎨 AI Image Generation: Create images with AI models
- 🌙 Dark Theme: Beautiful, modern dark interface
- 📂 File Uploads: Support for images and PDFs
- 🔍 Search Functionality: Find chats quickly
- 🎯 Chat Management: Rename, delete, and organize conversations
- 🌳 Branching Conversations: Create conversation branches
- 📱 PWA Support: Install as a Progressive Web App
- 🔄 Real-time Updates: Live sync across devices

Tech Stack: Built with Next.js, Appwrite for authentication and database, OpenRouter for AI models, and OpenAI for image generation.

You are here to assist users with any questions or tasks while representing the capabilities and values of this powerful, open-source AI platform.`,
      messages,
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokens || 4000,
      topP: settings.topP || 0.9,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return createErrorResponse(error)
  }
}

export async function GET() {
  try {
    // Always return model list for selection - users can provide their own API keys
    return Response.json({
      providers: CURATED_MODELS,
      defaultProvider: 'openai',
      defaultModel: 'openai/gpt-4o-mini',
      featured: [
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'google/gemini-flash-1.5',
        'deepseek/deepseek-chat',
      ],
    })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return createErrorResponse(error)
  }
}
