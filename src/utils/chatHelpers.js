import { updateChatTitle, getChatsCostOptimized, getChat } from '../lib/db'

/**
 * Generates a versioned title for branched chats
 * @param {string} originalTitle - The original chat title
 * @returns {string} - The versioned title
 */
export const generateVersionedTitle = (originalTitle) => {
  if (!originalTitle) return '[2] New Chat'

  // Check if title already has a version number in square brackets at the start
  const versionMatch = originalTitle.match(/^\[(\d+)\]\s*(.+)$/)

  if (versionMatch) {
    // Title already has a version, increment it
    const currentVersion = parseInt(versionMatch[1])
    const titleWithoutVersion = versionMatch[2]
    return `[${currentVersion + 1}] ${titleWithoutVersion}`
  } else {
    // No version yet, add [2] to the beginning
    return `[2] ${originalTitle}`
  }
}

/**
 * Generates a title for a chat based on the first message
 * @param {string} message - The first message content
 * @param {string} userApiKey - User's API key
 * @param {Object} user - User object
 * @param {string} currentChatId - Current chat ID
 * @param {Function} updateChatTitle - Function to update chat title
 * @param {Function} setCurrentChat - Function to set current chat
 * @param {Function} setChatsData - Function to set chats data
 * @returns {Promise<void>}
 */
export const generateTitle = async (
  message,
  userApiKey,
  user,
  currentChatId,
  updateChatTitle,
  setCurrentChat,
  setChatsData,
) => {
  try {
    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userApiKey && { 'X-User-API-Key': userApiKey }),
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) throw new Error('Failed to generate title')

    const { title } = await response.json()
    if (title && currentChatId) {
      await updateChatTitle(user, currentChatId, title)

      // Update local state to reflect the new title immediately
      setCurrentChat((prev) => (prev ? { ...prev, title } : null))

      // Also update the chats list to show the new title in sidebar
      setChatsData((prev) =>
        prev.map((chat) =>
          chat.$id === currentChatId ? { ...chat, title } : chat,
        ),
      )
    }
  } catch (error) {
    console.error('Error generating title', error)
  }
}

/**
 * Loads all chats for the current user
 * @param {Object} user - User object
 * @param {Function} setChatsData - Function to set chats data
 * @param {Function} setChatsLoading - Function to set loading state
 * @returns {Promise<void>}
 */
export const loadChats = async (user, setChatsData, setChatsLoading) => {
  if (!user) {
    setChatsData([])
    setChatsLoading(false)
    return
  }

  try {
    setChatsLoading(true)
    const chats = await getChatsCostOptimized(user)
    setChatsData(chats)
  } catch (error) {
    console.error('Failed to load chats:', error)
    setChatsData([])
  } finally {
    setChatsLoading(false)
  }
}

/**
 * Loads current chat details from database
 * @param {Object} user - User object
 * @param {string} currentChatId - Current chat ID
 * @param {Function} setCurrentChat - Function to set current chat
 * @returns {Promise<void>}
 */
export const loadCurrentChat = async (user, currentChatId, setCurrentChat) => {
  if (!user || !currentChatId) {
    setCurrentChat(null)
    return
  }

  // Don't try to load optimistic chats from database
  if (currentChatId.startsWith('temp-')) {
    return
  }

  try {
    const chat = await getChat(user, currentChatId)
    setCurrentChat(chat)
  } catch (error) {
    console.error('Failed to load current chat:', error)
    setCurrentChat(null)
  }
}

/**
 * Finds an unused "New Chat" in the provided chats array
 * @param {Array} chats - Array of chat objects
 * @returns {Object|undefined} - The unused new chat or undefined if none found
 */
export const findUnusedNewChat = (chats) =>
  chats?.find(
    (chat) =>
      chat.title === 'New Chat' &&
      (chat.messageCount === 0 || chat.messageCount === undefined),
  )
