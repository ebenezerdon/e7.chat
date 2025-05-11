import Dexie from 'dexie'

export const db = new Dexie('chatApp')

db.version(1).stores({
  chats: '++id, title, createdAt',
  messages: '++id, chatId, role, content, createdAt',
})

export const createChat = (title = 'New Chat') =>
  db.chats.add({
    title,
    createdAt: new Date().toISOString(),
  })

export const getChat = async (id) => db.chats.get(Number(id))

export const getChatMessages = (chatId) => {
  if (!chatId) return Promise.resolve([])

  return db.messages.where('chatId').equals(Number(chatId)).sortBy('createdAt')
}

export const saveMessage = async (chatId, role, content) => {
  const data = {
    chatId: Number(chatId),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
  await db.messages.add(data)

  return data
}

export const updateChatTitle = async (chatId, title) => {
  await db.chats.update(chatId, { title })
}

export const deleteChat = async (chatId) => {
  await db.messages.where('chatId').equals(Number(chatId)).delete()
  await db.chats.delete(Number(chatId))
}
