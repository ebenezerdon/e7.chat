import { createChat, saveMessage } from '../lib/db'
import { generateVersionedTitle } from './chatHelpers'

/**
 * Handles regenerating AI responses with optional chat branching
 * @param {number} messageIndex - Index of the message to regenerate
 * @param {string} modelId - Model ID to use for regeneration
 * @param {boolean} createNewChat - Whether to create a new branched chat
 * @param {Object} user - User object
 * @param {string} currentChatId - Current chat ID
 * @param {Object} currentChat - Current chat object
 * @param {Array} messages - Current messages array
 * @param {string} userApiKey - User's API key
 * @param {Function} setRegeneratingMessageIndex - Function to set regenerating message index
 * @param {Function} setMessages - Function to set messages
 * @param {Function} setCurrentChatId - Function to set current chat ID
 * @param {Function} setCurrentChat - Function to set current chat
 * @param {Function} setSavingMessages - Function to set saving messages
 * @param {Function} loadChats - Function to load chats
 * @param {Object} router - Next.js router object
 * @returns {Promise<void>}
 */
export const handleRegenerate = async (
  messageIndex,
  modelId,
  createNewChat = false,
  user,
  currentChatId,
  currentChat,
  messages,
  userApiKey,
  setRegeneratingMessageIndex,
  setMessages,
  setCurrentChatId,
  setCurrentChat,
  setSavingMessages,
  loadChats,
  router,
) => {
  if (!user || !currentChatId || messageIndex === undefined) return

  try {
    setRegeneratingMessageIndex(messageIndex)

    // Get all messages up to the message being regenerated (excluding the AI response)
    const messagesToRegenerate = messages.slice(0, messageIndex)

    // Make sure we have at least one user message to regenerate from
    if (messagesToRegenerate.length === 0) {
      throw new Error('No messages to regenerate from')
    }

    // Determine the target chat ID for regeneration
    let regenerationChatId = currentChatId
    let regenerationChat = currentChat

    // If creating new chat, handle branching
    if (createNewChat) {
      // Generate versioned title for the branched chat
      const branchedTitle = generateVersionedTitle(
        currentChat?.title || 'New Chat',
      )

      // Create a new chat with versioned title
      const newChat = await createChat(user, branchedTitle, {
        isBranch: true,
        parentChatId: currentChatId,
        parentChatTitle: currentChat?.title || 'Chat',
      })

      // Save all the messages to the new chat
      for (const message of messagesToRegenerate) {
        await saveMessage(
          user,
          newChat.$id,
          message.role,
          message.content,
          message.model || null,
        )
      }

      // Update target for regeneration
      regenerationChatId = newChat.$id
      regenerationChat = newChat

      // Navigate to the new chat
      router.push(`/?chatId=${newChat.$id}`)
      setCurrentChatId(newChat.$id)
      setCurrentChat(newChat)

      // Set messages state to show the copied messages in the new chat
      setMessages(messagesToRegenerate)

      // Update chats list to include the new chat
      await loadChats()
    }

    // Make API call with the selected model
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userApiKey && { 'X-User-API-Key': userApiKey }),
      },
      body: JSON.stringify({
        messages: messagesToRegenerate.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        model: modelId,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to regenerate response')
    }

    // Handle streaming response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulatedContent = ''

    // Create new message list by removing everything after messageIndex
    // and replacing the message at messageIndex with empty content for streaming
    let newMessages
    if (createNewChat) {
      // For new chat, start with the messages we copied and add the new one
      newMessages = [...messagesToRegenerate]
      newMessages.push({
        id: `regenerated-${Date.now()}`,
        role: 'assistant',
        content: '',
        model: modelId,
      })
    } else {
      // For same chat, replace the existing message
      newMessages = [...messages.slice(0, messageIndex + 1)]
      newMessages[messageIndex] = {
        ...newMessages[messageIndex],
        id: `regenerated-${Date.now()}`,
        content: '',
        model: modelId,
      }
    }
    setMessages(newMessages)

    // Stream the regenerated response
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            const content = JSON.parse(line.slice(2))
            if (content) {
              accumulatedContent += content

              // Update the regenerated message with new content
              setMessages((prev) => {
                const updated = [...prev]
                const targetIndex = createNewChat
                  ? prev.length - 1
                  : messageIndex
                updated[targetIndex] = {
                  ...updated[targetIndex],
                  content: accumulatedContent,
                  model: modelId,
                }
                return updated
              })
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e)
          }
        }
      }
    }

    // Save the regenerated message to database
    // For new chats, we need to reference the newly created chat
    // For existing chats, use the current chat ID
    if (regenerationChatId && accumulatedContent) {
      const targetIndex = createNewChat ? newMessages.length - 1 : messageIndex
      const messageId = newMessages[targetIndex].id
      setSavingMessages((prev) => new Set([...prev, messageId]))

      try {
        await saveMessage(
          user,
          regenerationChatId,
          'assistant',
          accumulatedContent,
          modelId,
        )
        setSavingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(messageId)
          return newSet
        })
      } catch (error) {
        console.error('Failed to save regenerated message:', error)
        setSavingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(messageId)
          return newSet
        })
      }
    }
  } catch (error) {
    console.error('Failed to regenerate message:', error)
    alert('Failed to regenerate response. Please try again.')
  } finally {
    setRegeneratingMessageIndex(null)
  }
}
