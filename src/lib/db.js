import Dexie from 'dexie'

export const db = new Dexie('chatApp')

db.version(1).stores({
  chats: '++id, title, createdAt',
  messages: '++id, chatId, role, content, createdAt',
})
