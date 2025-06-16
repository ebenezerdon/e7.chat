# Chat App Setup Guide

This chat application includes user authentication and chat history synchronization using Appwrite. Here's how to set it up:

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=ai-chat-db
NEXT_PUBLIC_APPWRITE_CHATS_COLLECTION_ID=chats
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=messages
```

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
