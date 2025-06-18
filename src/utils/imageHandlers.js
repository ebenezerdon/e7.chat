import { saveMessage } from '../lib/db'
import { generateTitle } from './chatHelpers'

/**
 * Handles image generation requests
 * @param {string} prompt - The image generation prompt
 * @param {string} originalMessage - The original user message
 * @param {Object} user - User object
 * @param {string} currentChatId - Current chat ID
 * @param {string} userOpenAiKey - User's OpenAI API key
 * @param {Array} messages - Current messages array
 * @param {Function} setMessages - Function to set messages
 * @param {string} userApiKey - User's API key
 * @param {Function} updateChatTitle - Function to update chat title
 * @param {Function} setCurrentChat - Function to set current chat
 * @param {Function} setChatsData - Function to set chats data
 * @param {Function} openAuthModal - Function to open auth modal
 * @returns {Promise<void>}
 */
export const handleImageGeneration = async (
  prompt,
  originalMessage,
  user,
  currentChatId,
  userOpenAiKey,
  messages,
  setMessages,
  userApiKey,
  updateChatTitle,
  setCurrentChat,
  setChatsData,
  openAuthModal,
) => {
  if (!user || !currentChatId) {
    openAuthModal()
    return
  }

  try {
    console.log('Generating image for prompt:', prompt)
    console.log(
      'Using OpenAI API key:',
      userOpenAiKey ? 'User key present' : 'No user key',
    )
    console.log(
      'User object:',
      user ? { id: user.$id, email: user.email } : 'No user',
    )

    // Add user message to chat immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: originalMessage,
      type: 'image-request',
    }

    // Add a loading message for the assistant
    const loadingMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'Generating image...',
      type: 'image-generating',
      imagePrompt: prompt,
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])

    // Save user message to database
    await saveMessage(
      user,
      currentChatId,
      userMessage.role,
      userMessage.content,
    )

    // Generate image
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userOpenAiKey && { 'X-User-API-Key': userOpenAiKey }),
        ...(user && { 'X-User-ID': user.$id }),
      },
      body: JSON.stringify({
        prompt: prompt,
        size: '1024x1024',
        quality: 'auto',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate image')
    }

    const imageData = {
      url: data.imageUrl,
      prompt: prompt,
      revisedPrompt: data.revisedPrompt,
      timestamp: new Date().toISOString(),
    }

    // Replace loading message with actual image
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `I've generated an image based on your request: "${prompt}"`,
      type: 'image-response',
      imageData: imageData,
    }

    setMessages((prev) => {
      const newMessages = [...prev]
      // Replace the loading message with the actual result
      newMessages[newMessages.length - 1] = assistantMessage
      return newMessages
    })

    // Save assistant message with image data to database
    const assistantMessageData = {
      content: assistantMessage.content,
      type: assistantMessage.type,
      imageData: assistantMessage.imageData,
    }

    await saveMessage(
      user,
      currentChatId,
      assistantMessage.role,
      JSON.stringify(assistantMessageData),
    )

    // Generate title if this is the first interaction
    if (messages.length === 0) {
      await generateTitle(
        originalMessage,
        userApiKey,
        user,
        currentChatId,
        updateChatTitle,
        setCurrentChat,
        setChatsData,
      )
    }
  } catch (error) {
    console.error('Image generation failed:', error)

    // Replace loading message with error message
    setMessages((prev) => {
      const newMessages = [...prev]
      newMessages[newMessages.length - 1] = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't generate the image. Error: ${error.message}`,
        type: 'error',
      }
      return newMessages
    })
  }
}
