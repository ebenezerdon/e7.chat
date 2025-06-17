import { Client, Databases, ID } from 'node-appwrite'

const serverClient = new Client()

serverClient
  .setEndpoint(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  )
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

export const serverDatabases = new Databases(serverClient)
export { ID }

// Database and Collection IDs
export const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ai-chat-db'
export const USER_PROFILES_COLLECTION_ID = 'user-profiles'
