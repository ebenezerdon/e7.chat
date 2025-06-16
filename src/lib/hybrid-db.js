import { db as localDb } from './db'
import {
  createChatInCloud,
  getUserChats,
  updateChatInCloud,
  deleteChatFromCloud,
  saveMessageToCloud,
  getChatMessagesFromCloud,
  syncLocalChatsToCloud,
} from './appwrite-db'

// Hybrid chat operations
export const createChat = async (user, title = 'New Chat') => {
  try {
    // Always create locally first for immediate response
    const localChatId = await localDb.chats.add({
      title,
      createdAt: new Date().toISOString(),
      synced: false,
      cloudId: null,
    })

    // If user is authenticated, also create in cloud
    if (user) {
      try {
        const cloudChat = await createChatInCloud(user.$id, title)
        // Update local chat with cloud ID
        await localDb.chats.update(localChatId, {
          cloudId: cloudChat.$id,
          synced: true,
        })
        return { localId: localChatId, cloudId: cloudChat.$id }
      } catch (error) {
        console.error('Failed to create chat in cloud:', error)
        return { localId: localChatId, cloudId: null }
      }
    }

    return { localId: localChatId, cloudId: null }
  } catch (error) {
    console.error('Error creating chat:', error)
    throw error
  }
}

export const getChats = async (user) => {
  try {
    if (user) {
      // Get cloud chats and sync with local
      try {
        const cloudChats = await getUserChats(user.$id)

        // Convert cloud chats to local format and update local storage
        for (const cloudChat of cloudChats) {
          const existingLocal = await localDb.chats
            .where('cloudId')
            .equals(cloudChat.$id)
            .first()

          if (!existingLocal) {
            await localDb.chats.add({
              title: cloudChat.title,
              createdAt: cloudChat.createdAt,
              synced: true,
              cloudId: cloudChat.$id,
            })
          }
        }

        return await localDb.chats.orderBy('createdAt').reverse().toArray()
      } catch (error) {
        console.error('Failed to fetch cloud chats:', error)
        // Fall back to local chats
        return await localDb.chats.orderBy('createdAt').reverse().toArray()
      }
    } else {
      // Return local chats only
      return await localDb.chats.orderBy('createdAt').reverse().toArray()
    }
  } catch (error) {
    console.error('Error getting chats:', error)
    return []
  }
}

export const updateChatTitle = async (user, chatId, title) => {
  try {
    // Update locally first
    await localDb.chats.update(chatId, { title, synced: false })

    // Update in cloud if user is authenticated
    if (user) {
      const localChat = await localDb.chats.get(chatId)
      if (localChat && localChat.cloudId) {
        try {
          await updateChatInCloud(localChat.cloudId, { title })
          await localDb.chats.update(chatId, { synced: true })
        } catch (error) {
          console.error('Failed to update chat title in cloud:', error)
        }
      }
    }
  } catch (error) {
    console.error('Error updating chat title:', error)
    throw error
  }
}

export const deleteChat = async (user, chatId) => {
  try {
    const localChat = await localDb.chats.get(chatId)

    // Delete from cloud first if it exists
    if (user && localChat && localChat.cloudId) {
      try {
        await deleteChatFromCloud(localChat.cloudId)
      } catch (error) {
        console.error('Failed to delete chat from cloud:', error)
      }
    }

    // Delete locally
    await localDb.messages.where('chatId').equals(Number(chatId)).delete()
    await localDb.chats.delete(Number(chatId))
  } catch (error) {
    console.error('Error deleting chat:', error)
    throw error
  }
}

// Hybrid message operations
export const saveMessage = async (user, chatId, role, content) => {
  try {
    // Save locally first
    const messageData = {
      chatId: Number(chatId),
      role,
      content,
      createdAt: new Date().toISOString(),
      synced: false,
      cloudId: null,
    }

    const localMessageId = await localDb.messages.add(messageData)

    // Save to cloud if user is authenticated
    if (user) {
      const localChat = await localDb.chats.get(Number(chatId))
      if (localChat && localChat.cloudId) {
        try {
          const cloudMessage = await saveMessageToCloud(
            localChat.cloudId,
            role,
            content,
            user.$id,
          )
          await localDb.messages.update(localMessageId, {
            cloudId: cloudMessage.$id,
            synced: true,
          })
        } catch (error) {
          console.error('Failed to save message to cloud:', error)
        }
      }
    }

    return messageData
  } catch (error) {
    console.error('Error saving message:', error)
    throw error
  }
}

export const getChatMessages = async (user, chatId) => {
  try {
    if (!chatId) return []

    if (user) {
      // Try to sync messages from cloud first
      const localChat = await localDb.chats.get(Number(chatId))
      if (localChat && localChat.cloudId) {
        try {
          const cloudMessages = await getChatMessagesFromCloud(
            localChat.cloudId,
          )

          // Update local messages with cloud data
          for (const cloudMessage of cloudMessages) {
            const existingLocal = await localDb.messages
              .where('cloudId')
              .equals(cloudMessage.$id)
              .first()

            if (!existingLocal) {
              await localDb.messages.add({
                chatId: Number(chatId),
                role: cloudMessage.role,
                content: cloudMessage.content,
                createdAt: cloudMessage.timestamp,
                synced: true,
                cloudId: cloudMessage.$id,
              })
            }
          }
        } catch (error) {
          console.error('Failed to sync messages from cloud:', error)
        }
      }
    }

    // Return local messages (now synced with cloud)
    return await localDb.messages
      .where('chatId')
      .equals(Number(chatId))
      .sortBy('createdAt')
  } catch (error) {
    console.error('Error getting chat messages:', error)
    return []
  }
}

// Sync operations
export const syncToCloud = async (user) => {
  if (!user) return

  try {
    // Get all unsynced local chats and messages
    const localChats = await localDb.chats.toArray()
    const localMessages = await localDb.messages.toArray()

    await syncLocalChatsToCloud(user.$id, localChats, localMessages)
  } catch (error) {
    console.error('Error syncing to cloud:', error)
  }
}

// Utility functions
export const getChat = async (chatId) => {
  return await localDb.chats.get(Number(chatId))
}
