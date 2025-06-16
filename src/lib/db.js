import { databases, ID, DATABASE_ID, CHATS_COLLECTION_ID } from './appwrite'
import { Query } from 'appwrite'

// Chat operations
export const createChat = async (user, title = 'New Chat') => {
  if (!user) {
    throw new Error('Authentication required to create chats')
  }

  try {
    const now = new Date().toISOString()
    const chatData = {
      title,
      userId: user.$id,
      messages: '[]', // Start with empty messages array as JSON string
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isArchived: false,
      isPinned: false,
    }

    const result = await databases.createDocument(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      ID.unique(),
      chatData,
      [
        `read("user:${user.$id}")`,
        `update("user:${user.$id}")`,
        `delete("user:${user.$id}")`,
      ],
    )

    return result
  } catch (error) {
    console.error('Error creating chat:', error)
    throw error
  }
}

export const getChats = async (user) => {
  if (!user) {
    return []
  }

  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('createdAt'),
        Query.limit(100),
      ],
    )

    return result.documents
  } catch (error) {
    console.error('Error fetching user chats:', error)
    throw error
  }
}

export const getChat = async (user, chatId) => {
  if (!user || !chatId) {
    return null
  }

  try {
    const chat = await databases.getDocument(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      chatId,
    )

    // Verify ownership
    if (chat.userId !== user.$id) {
      throw new Error('Unauthorized access to chat')
    }

    return chat
  } catch (error) {
    console.error('Error fetching chat:', error)
    return null
  }
}

export const updateChatTitle = async (user, chatId, title) => {
  if (!user) {
    throw new Error('Authentication required to update chats')
  }

  try {
    const updateData = {
      title,
      updatedAt: new Date().toISOString(),
    }

    const result = await databases.updateDocument(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      chatId,
      updateData,
    )

    return result
  } catch (error) {
    console.error('Error updating chat title:', error)
    throw error
  }
}

export const deleteChat = async (user, chatId) => {
  if (!user) {
    throw new Error('Authentication required to delete chats')
  }

  try {
    // Much simpler - just delete the chat document (messages are embedded)
    await databases.deleteDocument(DATABASE_ID, CHATS_COLLECTION_ID, chatId)
    console.log('Successfully deleted chat:', chatId)
  } catch (error) {
    console.error('Error deleting chat:', error)
    throw error
  }
}

// Message operations
export const saveMessage = async (user, chatId, role, content) => {
  if (!user) {
    throw new Error('Authentication required to save messages')
  }

  if (!chatId) {
    throw new Error('Chat ID is required to save messages')
  }

  try {
    // Get current chat to access existing messages
    const currentChat = await getChat(user, chatId)
    if (!currentChat) {
      throw new Error('Chat not found')
    }

    // Create new message object
    const newMessage = {
      id: ID.unique(), // Give each message a unique ID for React keys
      role,
      content,
      createdAt: new Date().toISOString(),
    }

    // Parse existing messages from JSON string
    const existingMessages = currentChat.messages
      ? JSON.parse(currentChat.messages)
      : []

    // Add message to existing messages array
    const updatedMessages = [...existingMessages, newMessage]

    // Update the chat document with new message and metadata
    const updateData = {
      messages: JSON.stringify(updatedMessages), // Store as JSON string
      messageCount: updatedMessages.length,
      updatedAt: new Date().toISOString(),
    }

    const result = await databases.updateDocument(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      chatId,
      updateData,
    )

    return newMessage // Return the new message
  } catch (error) {
    console.error('Error saving message:', error)
    throw error
  }
}

export const getChatMessages = async (user, chatId) => {
  if (!user || !chatId) {
    return []
  }

  try {
    const chat = await getChat(user, chatId)
    if (!chat) {
      return []
    }

    // Parse messages from JSON string and sort by creation time
    const messages = chat.messages ? JSON.parse(chat.messages) : []
    return messages.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    )
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    return []
  }
}

// No sync operations needed since we're using only cloud storage
export const syncToCloud = async (user) => {
  // No-op since we're already in the cloud
  console.log('Using cloud-only storage, no sync needed')
}
