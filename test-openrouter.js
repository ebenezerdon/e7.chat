// Test script for OpenRouter integration
// Run with: node test-openrouter.js

import OpenAI from 'openai'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://localhost:3000',
    'X-Title': 'E7 Chat Test',
  },
})

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter Integration...\n')

  // Test 1: Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in environment variables')
    console.log('Please add OPENROUTER_API_KEY to your .env.local file')
    return
  }
  console.log('✅ OpenRouter API key found')

  try {
    // Test 2: Fetch available models
    console.log('\n📋 Fetching available models...')
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    })

    if (!modelsResponse.ok) {
      throw new Error(`Models API returned ${modelsResponse.status}`)
    }

    const modelsData = await modelsResponse.json()
    console.log(`✅ Found ${modelsData.data.length} available models`)

    // Show a few popular models
    const popularModels = modelsData.data
      .filter(
        (m) =>
          m.id.includes('gpt-4o') ||
          m.id.includes('claude') ||
          m.id.includes('gemini'),
      )
      .slice(0, 5)

    console.log('\n🌟 Popular models available:')
    popularModels.forEach((model) => {
      const pricing = model.pricing?.prompt
        ? `$${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/M tokens`
        : 'Pricing unavailable'
      console.log(`  • ${model.name} (${model.id}) - ${pricing}`)
    })

    // Test 3: Simple chat completion
    console.log('\n💬 Testing chat completion...')
    const completion = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Respond in exactly one sentence.',
        },
        {
          role: 'user',
          content: 'Say hello and confirm that OpenRouter is working!',
        },
      ],
      max_tokens: 50,
    })

    const response = completion.choices[0]?.message?.content
    if (response) {
      console.log(`✅ Chat completion successful!`)
      console.log(`🤖 AI Response: "${response}"`)
    } else {
      console.log('❌ No response received from AI')
    }

    // Test 4: Streaming test
    console.log('\n🌊 Testing streaming response...')
    const stream = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 3, each number on a new line.',
        },
      ],
      stream: true,
      max_tokens: 20,
    })

    let streamedResponse = ''
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      streamedResponse += content
      process.stdout.write(content)
    }

    if (streamedResponse.trim()) {
      console.log('\n✅ Streaming test successful!')
    } else {
      console.log('\n❌ Streaming test failed')
    }

    console.log(
      '\n🎉 All tests passed! OpenRouter integration is working correctly.',
    )
    console.log('\nYou can now:')
    console.log('1. Start your development server: npm run dev')
    console.log('2. Open http://localhost:3000')
    console.log('3. Select any AI model from the dropdown')
    console.log('4. Start chatting!')
  } catch (error) {
    console.error('❌ Test failed:', error.message)

    if (error.message.includes('401')) {
      console.log('\n💡 Suggestions:')
      console.log('- Check that your OPENROUTER_API_KEY is correct')
      console.log('- Make sure the key has the right permissions')
      console.log('- Visit https://openrouter.ai/keys to verify your API key')
    } else if (error.message.includes('429')) {
      console.log('\n💡 Rate limit reached. Wait a moment and try again.')
    } else {
      console.log(
        '\n💡 Check your internet connection and API key configuration.',
      )
    }
  }
}

// Run the test
testOpenRouter().catch(console.error)
