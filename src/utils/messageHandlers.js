import { getChatMessages } from '../lib/db'

/**
 * Loads chat messages for a specific chat
 * @param {Object} user - User object
 * @param {string} currentChatId - Current chat ID
 * @param {Function} setMessages - Function to set messages
 * @returns {Promise<void>}
 */
export const loadChatMessages = async (user, currentChatId, setMessages) => {
  if (!user || !currentChatId) {
    setMessages([])
    return
  }

  // Don't try to load messages for optimistic chats
  if (currentChatId.startsWith('temp-')) {
    setMessages([])
    return
  }

  try {
    const loadedMessages = await getChatMessages(user, currentChatId)

    // Parse image messages that were stored as JSON
    const parsedMessages = loadedMessages.map((message) => {
      if (
        message.role === 'assistant' &&
        typeof message.content === 'string' &&
        message.content.startsWith('{')
      ) {
        try {
          const parsed = JSON.parse(message.content)
          if (parsed.type && parsed.imageData) {
            return {
              ...message,
              content: parsed.content,
              type: parsed.type,
              imageData: parsed.imageData,
            }
          }
        } catch (e) {
          console.log('Failed to parse message as JSON:', e)
        }
      }
      return message
    })

    setMessages(parsedMessages)
  } catch (error) {
    console.error('Failed to load messages', error)
    setMessages([])
  }
}
