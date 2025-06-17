# Chat App Setup Guide

This chat application includes user authentication and chat history synchronization using Appwrite, with AI models powered by OpenRouter for unified access to multiple AI providers.

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# OpenRouter API Configuration (replaces individual provider keys)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Site identification for OpenRouter analytics
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SITE_NAME=Your Chat App Name

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=ai-chat-db
NEXT_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=chats
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=messages
```

## OpenRouter Setup

### 1. Get Your OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the key (it will start with `sk-or-`)

### 2. Benefits of OpenRouter Integration

✅ **Unified API**: Access 100+ AI models through a single API
✅ **Cost Optimization**: Automatic fallbacks and model routing
✅ **Provider Diversity**: OpenAI, Anthropic, Google, Meta, DeepSeek, and more
✅ **Real-time Pricing**: Live pricing information for cost transparency
✅ **No Vendor Lock-in**: Easy switching between models and providers

### 3. Available Models

Through OpenRouter, you now have access to:

- **OpenAI**: GPT-4o, GPT-4o-mini, o1, o1-mini, o3-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Meta**: Llama 3.1 405B, Llama 3.1 70B, Llama 3.1 8B
- **DeepSeek**: DeepSeek V3, DeepSeek R1
- **And many more**: Qwen, Mistral, Cohere, and other providers

## Appwrite Database Schema

Your existing Appwrite database (`ai-chat-db`) already has the correct collections and attributes:

### Chats Collection (`chats`)

- ✅ title (string, required)
- ✅ userId (string, required)
- ✅ createdAt (datetime, required)
- ✅ updatedAt (datetime, required)
- ✅ messageCount (integer, default: 0)
- ✅ lastMessage (string, optional)
- ✅ tags (array of strings, optional)
- ✅ isArchived (boolean, default: false)
- ✅ isPinned (boolean, default: false)
- ✅ model (string, optional)
- ✅ provider (string, optional)

### Messages Collection (`messages`)

- ✅ chatId (string, required)
- ✅ content (string, required)
- ✅ role (string, required)
- ✅ timestamp (datetime, required)
- ✅ attachments (array of strings, optional)
- ✅ model (string, optional)
- ✅ provider (string, optional)
- ✅ usage (string, optional)
- ✅ reasoning (string, optional)
- ✅ confidence (double, optional)
- ✅ executionTime (integer, optional)
- ✅ isEdited (boolean, default: false)
- ✅ editHistory (array of strings, optional)
- ✅ reactions (array of strings, optional)

## Getting Your Appwrite Project ID

1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Select your project
3. Go to Settings → General
4. Copy your Project ID

## Features

✅ **User Authentication**

- Email/password registration and login
- Secure session management
- User menu with logout functionality

✅ **Chat History Synchronization**

- Automatic sync between local storage and cloud
- Offline functionality with sync when online
- Cross-device chat history access

✅ **Hybrid Storage**

- Local-first approach for immediate response
- Background cloud synchronization
- Fallback to local storage if cloud is unavailable

✅ **AI Integration via OpenRouter**

- Access to 100+ AI models through one API
- Real-time model selection
- Cost-effective model routing
- Automatic fallbacks and error handling

✅ **Image Generation**

- AI-powered image generation
- Multiple size and quality options
- Download and share capabilities

✅ **Modern UI/UX**

- Responsive design
- Dark theme optimized
- Smooth animations and transitions
- Accessibility features

## How It Works

1. **Guest Mode**: Without authentication, chats are stored locally only
2. **Authenticated Mode**: Chats are stored both locally and in the cloud
3. **Auto-Sync**: When users log in, local chats are automatically synced to cloud
4. **Cross-Device**: Users can access their chat history from any device after logging in

## Usage

1. Start the development server: `npm run dev`
2. Use the app without login (local storage only)
3. Click "Sign In" to register/login for cloud sync
4. Your existing local chats will be synced to the cloud automatically
5. New chats will be saved both locally and in the cloud

## Troubleshooting

- If you see authentication errors, check your Appwrite project settings
- Make sure your environment variables are correctly set
- The app falls back to local storage if cloud sync fails
- Check browser console for detailed error messages

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see above)
4. Run development server: `npm run dev`

## Migration from Individual Providers

If you were previously using individual API keys for OpenAI, Anthropic, etc., you can now:

1. Remove the old environment variables:

   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_API_KEY`
   - `DEEPSEEK_API_KEY`

2. Add your OpenRouter API key:

   - `OPENROUTER_API_KEY`

3. Your chat history and user data remain unchanged

The app will automatically use OpenRouter's unified API for all AI model interactions, giving you access to more models with better cost optimization.

## Support

For OpenRouter-specific issues, visit [OpenRouter Documentation](https://openrouter.ai/docs)
For Appwrite issues, visit [Appwrite Documentation](https://appwrite.io/docs)
