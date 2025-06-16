import {
  databases,
  ID,
  DATABASE_ID,
  CHATS_COLLECTION_ID,
  MESSAGES_COLLECTION_ID,
} from './appwrite'
import { Query } from 'appwrite'

// Chat operations
export const createChatInCloud = async (userId, title = 'New Chat') => {
  try {
    const now = new Date().toISOString()
    const chatData = {
      title,
      userId,
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
        `read("user:${userId}")`,
        `update("user:${userId}")`,
        `delete("user:${userId}")`,
      ],
    )

    return result
  } catch (error) {
    console.error('Error creating chat in cloud:', error)
    throw error
  }
}

export const getUserChats = async (userId) => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(100), // Add a reasonable limit
      ],
    )

    return result.documents
  } catch (error) {
    console.error('Error fetching user chats:', error)
    throw error
  }
}

export const updateChatInCloud = async (chatId, data) => {
  try {
    const updateData = {
      ...data,
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
    console.error('Error updating chat in cloud:', error)
    throw error
  }
}

export const deleteChatFromCloud = async (chatId) => {
  try {
    // First delete all messages in the chat
    const messages = await getChatMessagesFromCloud(chatId)
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
  } catch (error) {
    console.error('Error deleting chat from cloud:', error)
    throw error
  }
}

// Message operations
export const saveMessageToCloud = async (chatId, role, content, userId) => {
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
        `read("user:${userId}")`,
        `update("user:${userId}")`,
        `delete("user:${userId}")`,
      ],
    )

    return result
  } catch (error) {
    console.error('Error saving message to cloud:', error)
    throw error
  }
}

export const getChatMessagesFromCloud = async (chatId) => {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      [
        Query.equal('chatId', chatId),
        Query.orderAsc('timestamp'),
        Query.limit(1000), // Add a reasonable limit for messages
      ],
    )

    return result.documents
  } catch (error) {
    console.error('Error fetching chat messages from cloud:', error)
    throw error
  }
}

// Sync operations
export const syncLocalChatsToCloud = async (
  userId,
  localChats,
  localMessages,
) => {
  try {
    const cloudChats = await getUserChats(userId)
    const syncedChats = []

    for (const localChat of localChats) {
      // Check if chat already exists in cloud
      const existingChat = cloudChats.find(
        (cloudChat) =>
          cloudChat.title === localChat.title &&
          Math.abs(
            new Date(cloudChat.createdAt) - new Date(localChat.createdAt),
          ) < 1000,
      )

      if (!existingChat) {
        // Create new chat in cloud
        const cloudChat = await createChatInCloud(userId, localChat.title)

        // Sync messages for this chat
        const chatMessages = localMessages.filter(
          (msg) => msg.chatId === localChat.id,
        )
        for (const message of chatMessages) {
          await saveMessageToCloud(
            cloudChat.$id,
            message.role,
            message.content,
            userId,
          )
        }

        syncedChats.push({ local: localChat, cloud: cloudChat })
      }
    }

    return syncedChats
  } catch (error) {
    console.error('Error syncing local chats to cloud:', error)
    throw error
  }
}
