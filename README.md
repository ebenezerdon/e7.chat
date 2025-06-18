# e7.chat

> The open-source alternative to ChatGPT

Live url: [https://e7.chat](https://e7.chat)

A modern, full-featured AI chat application built with Next.js, featuring multi-provider AI model access, image generation, user authentication, chat sharing, branching conversations, file attachments, and cloud synchronization.

## ✨ Features

- 🤖 **Multi-AI Model Support** - Access 100+ AI models via OpenRouter integration
- 🔐 **Multiple Authentication Methods** - Email/password and OAuth (Google, GitHub)
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 💾 **Cloud Sync** - Chat history synchronized across devices
- 🔗 **Chat Sharing** - Share conversations with public links
- 🎨 **AI Image Generation** - Create images with AI models
- 🌙 **Dark Theme** - Beautiful, modern dark interface
- 📂 **File Uploads** - Support for images and PDFs
- 🔍 **Search Functionality** - Find chats quickly
- 🎯 **Chat Management** - Rename, delete, and organize conversations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- An [Appwrite](https://appwrite.io) account (free)
- An [OpenRouter](https://openrouter.ai)
- An [OpenAI api key for image generation](https://platform.openai.com/docs/api-reference/introduction)

### 1. Clone the Repository

```bash
git clone https://github.com/ebenezerdon/e7.chat.git
cd e7.chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the project root:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Site Information (Optional)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=e7.chat

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_server_api_key

# Database Configuration (Optional - will use defaults)
NEXT_PUBLIC_APPWRITE_DATABASE_ID=ai-chat-db
NEXT_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=chats

# Optional: OpenAI API Key for image generation
OPENAI_API_KEY=your_openai_api_key_for_images
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application running!

## 🔧 Setup Guides

### OpenRouter Setup

1. **Get API Key**

   - Visit [OpenRouter](https://openrouter.ai)
   - Sign up for a free account
   - Navigate to [API Keys](https://openrouter.ai/keys)
   - Create a new API key
   - Copy the key (starts with `sk-or-`)

2. **Add to Environment**
   ```env
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

### Appwrite Setup

#### 1. Create Project

1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Create a new project
3. Copy your Project ID

#### 2. Configure Authentication

1. Go to **Auth** → **Settings**
2. Add your domain to **Domains**: `http://localhost:3000`, `https://yourdomain.com`
3. Enable **Email/Password** authentication

#### 3. Set Up OAuth (Optional)

For Google and GitHub sign-in, follow our detailed [OAuth Setup Guide](./OAUTH_SETUP.md).

#### 4. Create Database

```bash
# Run this script to set up your database automatically
npm run setup-db
```

Or manually create:

1. **Database**: `ai-chat-db`
2. **Collections**:
   - `chats` - Stores chat conversations
   - `shared-chats` - Stores shared chat links
   - `user-chat-metadata` - Optimized chat metadata
   - `user-profiles` - User preferences and API keys

#### 5. Set Permissions

For each collection, set these permissions:

- **Create**: `users`
- **Read**: `users`
- **Update**: `users`
- **Delete**: `users`

#### 6. Get Server API Key

1. Go to **Overview** → **Integrate with your server**
2. Create an API Key with these scopes:
   - `databases.read`
   - `databases.write`
3. Copy the key to `APPWRITE_API_KEY`

## 🏗️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Authentication**: [Appwrite](https://appwrite.io/)
- **Database**: [Appwrite Database](https://appwrite.io/docs/products/databases)
- **AI Models**: [OpenRouter](https://openrouter.ai/) (100+ models)
- **Image Generation**: [OpenAI DALL-E](https://openai.com/dall-e)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown**: [React Markdown](https://github.com/remarkjs/react-markdown)
- **Code Highlighting**: [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

## 📁 Project Structure

```
e7.chat/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API Routes
│   │   │   ├── chat/        # Chat completions
│   │   │   ├── generate-image/  # AI image generation
│   │   │   ├── generate-title/  # Auto-generate chat titles
│   │   │   └── user/        # User management
│   │   ├── auth/            # Authentication pages
│   │   └── share/           # Shared chat pages
│   ├── components/          # React Components
│   │   ├── AuthModal.jsx    # Authentication modal
│   │   ├── ChatThread.jsx   # Chat message display
│   │   ├── Sidebar.jsx      # Chat history sidebar
│   │   └── ...              # Other components
│   ├── lib/                 # Utility libraries
│   │   ├── appwrite.js      # Appwrite client config
│   │   ├── auth.js          # Authentication logic
│   │   └── db.js            # Database operations
│   └── styles/              # CSS styles
├── public/                  # Static assets
├── .env.local              # Environment variables
└── package.json            # Dependencies
```

## 🎯 Available AI Models

Through OpenRouter, you have access to:

### Popular Models

- **OpenAI**: GPT-4o, GPT-4o-mini, o1, o1-mini, o3-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Meta**: Llama 3.1 405B, Llama 3.1 70B, Llama 3.1 8B
- **DeepSeek**: DeepSeek V3, DeepSeek R1

### Specialized Models

- **Qwen**: Qwen 2.5 series
- **Mistral**: Mistral 7B, 8x7B, 8x22B
- **Cohere**: Command R+
- **And 90+ more models**

### Scripts

````bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```          |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run linting: `npm run lint`
5. Commit: `git commit -m "Add feature"`
6. Push: `git push origin feature-name`
7. Create a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **OpenRouter**: [OpenRouter Documentation](https://openrouter.ai/docs)
- **Appwrite**: [Appwrite Documentation](https://appwrite.io/docs)

## 🙏 Acknowledgments

- [Appwrite](https://appwrite.io) for backend services
- [OpenRouter](https://openrouter.ai) for unified AI model access
- [Next.js](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide](https://lucide.dev) for icons

---

Built by [Ebenezer Don](https://github.com/ebenezerdon)
````
