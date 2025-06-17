import {
  databases,
  ID,
  DATABASE_ID,
  CHATS_COLLECTION_ID,
  SHARED_CHATS_COLLECTION_ID,
} from './appwrite'
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
export const createChat = async (user, title = 'New Chat', metadata = {}) => {
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
      // Add metadata fields for branching
      isBranch: metadata.isBranch || false,
      parentChatId: metadata.parentChatId || null,
      parentChatTitle: metadata.parentChatTitle || null,
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
        isBranch: chatData.isBranch || false,
        parentChatId: chatData.parentChatId || null,
        parentChatTitle: chatData.parentChatTitle || null,
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
          isBranch:
            chatData.isBranch !== undefined
              ? chatData.isBranch
              : chatSummaries[index].isBranch,
          parentChatId:
            chatData.parentChatId !== undefined
              ? chatData.parentChatId
              : chatSummaries[index].parentChatId,
          parentChatTitle:
            chatData.parentChatTitle !== undefined
              ? chatData.parentChatTitle
              : chatSummaries[index].parentChatTitle,
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
export const saveMessage = async (
  user,
  chatId,
  role,
  content,
  model = null,
) => {
  if (!user) {
    throw new Error('Authentication required to save messages')
  }

  if (!chatId) {
    throw new Error('Chat ID is required to save messages')
  }

  try {
    // Create new message object
    const newMessage = {
      id: ID.unique(), // Give each message a unique ID for React keys
      role,
      content,
      createdAt: new Date().toISOString(),
      ...(model && { model }), // Add model only if provided
    }

    // Get current chat to access existing messages (select only needed fields)
    const currentChat = await databases.getDocument(
      DATABASE_ID,
      CHATS_COLLECTION_ID,
      chatId,
      [Query.select(['messages', 'messageCount', 'userId'])],
    )

    // Verify ownership
    if (currentChat.userId !== user.$id) {
      throw new Error('Unauthorized access to chat')
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

    // Update cost-optimized metadata with new message count (don't await to make it non-blocking)
    updateChatInMetadata(user, result, 'update').catch((error) => {
      console.error('Non-critical: Failed to update chat metadata:', error)
    })

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

// Share functionality
export const shareChat = async (user, chatId) => {
  if (!user || !chatId) {
    throw new Error('User and chat ID are required to share a chat')
  }

  try {
    // Get the original chat
    const originalChat = await getChat(user, chatId)
    if (!originalChat) {
      throw new Error('Chat not found')
    }

    // Generate a unique share ID
    const shareId = ID.unique()

    // Create shared chat data
    const sharedChatData = {
      shareId,
      originalChatId: chatId,
      title: originalChat.title,
      messages: originalChat.messages,
      sharedBy: user.name || user.email,
      sharedAt: new Date().toISOString(),
      isActive: true,
    }

    // Create the shared chat document (publicly readable)
    const result = await databases.createDocument(
      DATABASE_ID,
      SHARED_CHATS_COLLECTION_ID,
      ID.unique(),
      sharedChatData,
    )

    return {
      shareId,
      shareUrl: `${
        typeof window !== 'undefined' ? window.location.origin : ''
      }/share/${shareId}`,
      ...result,
    }
  } catch (error) {
    console.error('Error sharing chat:', error)
    throw error
  }
}

export const getSharedChat = async (shareId) => {
  if (!shareId) {
    return null
  }

  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      SHARED_CHATS_COLLECTION_ID,
      [
        Query.equal('shareId', shareId),
        Query.equal('isActive', true),
        Query.limit(1),
      ],
    )

    return result.documents[0] || null
  } catch (error) {
    console.error('Error fetching shared chat:', error)
    return null
  }
}

export const unshareChat = async (user, chatId) => {
  if (!user || !chatId) {
    throw new Error('User and chat ID are required to unshare a chat')
  }

  try {
    // Find the shared chat document
    const result = await databases.listDocuments(
      DATABASE_ID,
      SHARED_CHATS_COLLECTION_ID,
      [Query.equal('originalChatId', chatId), Query.equal('isActive', true)],
    )

    if (result.documents.length === 0) {
      throw new Error('Shared chat not found')
    }

    const sharedChat = result.documents[0]

    // Verify ownership by checking if the user who's trying to unshare is the same as sharedBy
    const originalChat = await getChat(user, chatId)
    if (!originalChat) {
      throw new Error('Original chat not found or access denied')
    }

    // Deactivate the share
    await databases.updateDocument(
      DATABASE_ID,
      SHARED_CHATS_COLLECTION_ID,
      sharedChat.$id,
      { isActive: false },
    )

    return true
  } catch (error) {
    console.error('Error unsharing chat:', error)
    throw error
  }
}

export const getChatShareStatus = async (user, chatId) => {
  if (!user || !chatId) {
    return { isShared: false }
  }

  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      SHARED_CHATS_COLLECTION_ID,
      [
        Query.equal('originalChatId', chatId),
        Query.equal('isActive', true),
        Query.limit(1),
      ],
    )

    if (result.documents.length > 0) {
      const sharedChat = result.documents[0]
      return {
        isShared: true,
        shareId: sharedChat.shareId,
        shareUrl: `${
          typeof window !== 'undefined' ? window.location.origin : ''
        }/share/${sharedChat.shareId}`,
        sharedAt: sharedChat.sharedAt,
      }
    }

    return { isShared: false }
  } catch (error) {
    console.error('Error checking share status:', error)
    return { isShared: false }
  }
}

// Function to get shared chat messages (for public viewing)
export const getSharedChatMessages = async (shareId) => {
  try {
    const sharedChat = await getSharedChat(shareId)
    if (!sharedChat) {
      return []
    }

    // Parse messages from JSON string and sort by creation time
    const messages = sharedChat.messages ? JSON.parse(sharedChat.messages) : []
    return messages.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    )
  } catch (error) {
    console.error('Error fetching shared chat messages:', error)
    return []
  }
}

// User preferences operations using Appwrite's built-in Account API
export const saveUserPreference = async (account, key, value) => {
  if (!account) {
    throw new Error('Authentication required to save preferences')
  }

  try {
    // Get current preferences
    const currentPrefs = await account.getPrefs()

    // Update with new preference
    const updatedPrefs = {
      ...currentPrefs,
      [key]: value,
    }

    // Save updated preferences
    await account.updatePrefs(updatedPrefs)
  } catch (error) {
    console.error('Error saving user preference:', error)
    throw error
  }
}

export const getUserPreferences = async (account) => {
  if (!account) return {}

  try {
    const preferences = await account.getPrefs()
    return preferences
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return {}
  }
}
