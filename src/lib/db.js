import {
  databases,
  ID,
  DATABASE_ID,
  CHATS_COLLECTION_ID,
  MESSAGES_COLLECTION_ID,
} from './appwrite'
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
    // First delete all messages in the chat
    const messages = await getChatMessages(user, chatId)
    await Promise.all(
      messages.map((message) =>
        databases.deleteDocument(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          message.$id,
        ),
      ),
    )

    // Then delete the chat
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
    const messageData = {
      chatId,
      role,
      content,
      timestamp: new Date().toISOString(),
      isEdited: false,
    }

    const result = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      ID.unique(),
      messageData,
      [
        `read("user:${user.$id}")`,
        `update("user:${user.$id}")`,
        `delete("user:${user.$id}")`,
      ],
    )

    return result
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
    const result = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      [
        Query.equal('chatId', chatId),
        Query.orderAsc('timestamp'),
        Query.limit(1000),
      ],
    )

    return result.documents.map((message) => ({
      id: message.$id,
      role: message.role,
      content: message.content,
      createdAt: message.timestamp,
    }))
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
