import { Client, Account, Databases, ID } from 'appwrite'

const client = new Client()

client
  .setEndpoint(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  )
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)

export const account = new Account(client)
export const databases = new Databases(client)

export { ID }
export { client }

// Database and Collection IDs
export const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ai-chat-db'
export const CHATS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CHATS_COLLECTION_ID || 'chats'
