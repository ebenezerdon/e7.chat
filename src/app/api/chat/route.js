import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, smoothStream } from 'ai'

export const maxDuration = 60

// Available LLM providers and their models
const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    createClient: () =>
      createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    models: {
      'gpt-4o': {
        name: 'GPT-4o',
        description: 'Multimodal flagship model',
      },
      'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        description: 'Efficient cost-optimized model',
      },
      o1: {
        name: 'o1',
        description: 'Chain-of-thought reasoning model',
      },
      'o1-mini': {
        name: 'o1 Mini',
        description: 'Compact reasoning model',
      },
    },
  },
  anthropic: {
    name: 'Anthropic',
    createClient: () =>
      createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      }),
    models: {
      'claude-3-5-sonnet-20241022': {
        name: 'Claude 3.5 Sonnet',
        description: 'High-performance general model',
      },
      'claude-3-5-haiku-20241022': {
        name: 'Claude 3.5 Haiku',
        description: 'Speed-optimized model',
      },
      'claude-3-opus-20240229': {
        name: 'Claude 3 Opus',
        description: 'Large context flagship model',
      },
      'claude-3-sonnet-20240229': {
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance model',
      },
      'claude-3-haiku-20240307': {
        name: 'Claude 3 Haiku',
        description: 'Lightweight efficient model',
      },
    },
  },
  google: {
    name: 'Google',
    createClient: () =>
      createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
      }),
    models: {
      'gemini-2.5-flash-preview-05-20': {
        name: 'Gemini 2.5 Flash Preview',
        description: 'Hybrid reasoning with thinking budgets',
      },
      'gemini-2.0-flash': {
        name: 'Gemini 2.0 Flash',
        description: 'Multimodal with 1M token context',
      },
      'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        description: 'High-volume task optimization',
      },
    },
  },
  deepseek: {
    name: 'DeepSeek',
    createClient: () =>
      createOpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
      }),
    models: {
      'deepseek-chat': {
        name: 'DeepSeek V3-0324',
        description: 'General-purpose chat model',
      },
      'deepseek-reasoner': {
        name: 'DeepSeek R1-0528',
        description: 'Step-by-step reasoning model',
      },
    },
  },
}

// Default model configurations
const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-2.0-flash',
  deepseek: 'deepseek-chat',
}

function getModelClient(provider, model) {
  const providerConfig = LLM_PROVIDERS[provider]
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  const client = providerConfig.createClient()
  const modelId = model || DEFAULT_MODELS[provider]

  if (!providerConfig.models[modelId]) {
    throw new Error(`Unsupported model ${modelId} for provider ${provider}`)
  }

  return client(modelId)
}

function getSystemPrompt(provider) {
  const basePrompt =
    'You are a helpful, harmless, and honest AI assistant named Lexi.'

  switch (provider) {
    case 'anthropic':
      return `${basePrompt} You are Claude, created by Anthropic. Be helpful, harmless, and honest in your responses.`
    case 'google':
      return `${basePrompt} You are Gemini, created by Google. Provide accurate and helpful information.`
    case 'deepseek':
      return `${basePrompt} You are powered by DeepSeek's technology. You excel at reasoning and coding tasks.`
    case 'openai':
    default:
      return `${basePrompt} You are powered by OpenAI's technology.`
  }
}

export async function POST(req) {
  try {
    const {
      messages,
      provider = 'openai',
      model,
      settings = {},
    } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 },
      )
    }

    // Validate provider
    if (!LLM_PROVIDERS[provider]) {
      return Response.json(
        {
          error: `Unsupported provider: ${provider}. Available providers: ${Object.keys(
            LLM_PROVIDERS,
          ).join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Check if provider API key is available
    const requiredEnvKeys = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
    }

    const requiredKey = requiredEnvKeys[provider]
    if (!process.env[requiredKey]) {
      return Response.json(
        {
          error: `${LLM_PROVIDERS[provider].name} API key not configured. Please set ${requiredKey} environment variable.`,
        },
        { status: 500 },
      )
    }

    // Get the appropriate model client
    const modelClient = getModelClient(provider, model)

    // Configure stream options based on provider
    const streamOptions = {
      model: modelClient,
      system: getSystemPrompt(provider),
      messages,
      experimental_transform: smoothStream(),
      // Apply custom settings
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokens || 4000,
      topP: settings.topP || 0.9,
    }

    // Remove undefined values to avoid API errors
    Object.keys(streamOptions).forEach(
      (key) => streamOptions[key] === undefined && delete streamOptions[key],
    )

    const result = streamText(streamOptions)

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)

    // Handle specific API errors
    if (error.message?.includes('API key')) {
      return Response.json(
        {
          error: 'Invalid or missing API key. Please check your configuration.',
        },
        { status: 401 },
      )
    }

    if (
      error.message?.includes('rate limit') ||
      error.message?.includes('quota')
    ) {
      return Response.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 },
      )
    }

    return Response.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 },
    )
  }
}

// GET endpoint to retrieve available models and providers
export async function GET() {
  try {
    const availableProviders = {}

    // Check which providers have API keys configured
    for (const [key, config] of Object.entries(LLM_PROVIDERS)) {
      const envKey = {
        openai: 'OPENAI_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        google: 'GOOGLE_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
      }[key]

      if (process.env[envKey]) {
        availableProviders[key] = {
          name: config.name,
          models: config.models,
          defaultModel: DEFAULT_MODELS[key],
        }
      }
    }

    return Response.json({
      providers: availableProviders,
      defaultProvider: 'openai',
    })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return Response.json(
      { error: 'Failed to fetch available providers' },
      { status: 500 },
    )
  }
}
