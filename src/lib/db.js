import { databases, ID, DATABASE_ID, CHATS_COLLECTION_ID } from './appwrite'
import { Query } from 'appwrite'

// Collection IDs
const CHAT_METADATA_COLLECTION_ID = 'user-chat-metadata'

// Chat metadata operations (cost-optimized)
const getUserMetadataDoc = async (user) => {
  if (!user) return null

  try {
    // Try to get existing metadata document
    const result = await databases.listDocuments(
      DATABASE_ID,
      CHAT_METADATA_COLLECTION_ID,
      [Query.equal('userId', user.$id), Query.limit(1)],
    )

    return result.documents[0] || null
  } catch (error) {
    console.error('Error fetching user metadata:', error)
    return null
  }
}

const updateUserMetadata = async (user, chatSummaries) => {
  if (!user) return

  try {
    const existingDoc = await getUserMetadataDoc(user)
    const data = {
      userId: user.$id,
      chatSummaries: JSON.stringify(chatSummaries),
      updatedAt: new Date().toISOString(),
    }

    if (existingDoc) {
      // Update existing document
      await databases.updateDocument(
        DATABASE_ID,
        CHAT_METADATA_COLLECTION_ID,
        existingDoc.$id,
        data,
      )
    } else {
      // Create new document
      await databases.createDocument(
        DATABASE_ID,
        CHAT_METADATA_COLLECTION_ID,
        ID.unique(),
        data,
        [
          `read("user:${user.$id}")`,
          `update("user:${user.$id}")`,
          `delete("user:${user.$id}")`,
        ],
      )
    }
  } catch (error) {
    console.error('Error updating user metadata:', error)
    throw error
  }
}

// Cost-optimized chat list fetching
export const getChatsCostOptimized = async (user) => {
  if (!user) return []

  try {
    const metadataDoc = await getUserMetadataDoc(user)
    if (!metadataDoc) return []

    const chatSummaries = JSON.parse(metadataDoc.chatSummaries || '[]')
    return chatSummaries.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
  } catch (error) {
    console.error('Error fetching chats (cost-optimized):', error)
    throw error
  }
}

// Original method (keeping for comparison)
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
        Query.select([
          '$id',
          'title',
          'createdAt',
          'updatedAt',
          'messageCount',
          'isArchived',
          'isPinned',
        ]),
      ],
    )

    return result.documents
  } catch (error) {
    console.error('Error fetching user chats:', error)
    throw error
  }
}

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

    // Update cost-optimized metadata
    await updateChatInMetadata(user, result, 'create')

    return result
  } catch (error) {
    console.error('Error creating chat:', error)
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

    // Update cost-optimized metadata
    await updateChatInMetadata(user, result, 'update')

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
    // Delete the chat document (messages are embedded)
    await databases.deleteDocument(DATABASE_ID, CHATS_COLLECTION_ID, chatId)

    // Update cost-optimized metadata
    await updateChatInMetadata(user, { $id: chatId }, 'delete')

    console.log('Successfully deleted chat:', chatId)
  } catch (error) {
    console.error('Error deleting chat:', error)
    throw error
  }
}

// Helper function to maintain metadata document
const updateChatInMetadata = async (user, chatData, operation) => {
  try {
    const metadataDoc = await getUserMetadataDoc(user)
    let chatSummaries = metadataDoc
      ? JSON.parse(metadataDoc.chatSummaries || '[]')
      : []

    if (operation === 'create') {
      // Add new chat summary at the beginning (newest first)
      chatSummaries.unshift({
        $id: chatData.$id,
        title: chatData.title,
        createdAt: chatData.createdAt,
        updatedAt: chatData.updatedAt,
        messageCount: chatData.messageCount || 0,
        isArchived: chatData.isArchived || false,
        isPinned: chatData.isPinned || false,
      })
    } else if (operation === 'update') {
      // Update existing chat summary
      const index = chatSummaries.findIndex((chat) => chat.$id === chatData.$id)
      if (index !== -1) {
        chatSummaries[index] = {
          ...chatSummaries[index],
          title: chatData.title,
          updatedAt: chatData.updatedAt,
          messageCount:
            chatData.messageCount || chatSummaries[index].messageCount,
          isArchived:
            chatData.isArchived !== undefined
              ? chatData.isArchived
              : chatSummaries[index].isArchived,
          isPinned:
            chatData.isPinned !== undefined
              ? chatData.isPinned
              : chatSummaries[index].isPinned,
        }
      }
    } else if (operation === 'delete') {
      // Remove chat summary
      chatSummaries = chatSummaries.filter((chat) => chat.$id !== chatData.$id)
    }

    await updateUserMetadata(user, chatSummaries)
  } catch (error) {
    console.error('Error updating chat metadata:', error)
    // Don't throw - metadata update shouldn't break main operations
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

    // Update cost-optimized metadata with new message count
    await updateChatInMetadata(user, result, 'update')

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
