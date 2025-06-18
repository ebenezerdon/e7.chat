import { useState, useEffect } from 'react'
import { databases, DATABASE_ID } from '../lib/appwrite'
import { decrypt } from '../utils/encryption'

/**
 * Custom hook for managing user API keys (OpenRouter and OpenAI)
 * @param {Object} user - The authenticated user object
 * @returns {Object} - { userApiKey, userOpenAiKey, setUserApiKey, setUserOpenAiKey }
 */
export const useApiKeys = (user) => {
  const [userApiKey, setUserApiKey] = useState(null) // OpenRouter API key
  const [userOpenAiKey, setUserOpenAiKey] = useState(null) // OpenAI API key

  useEffect(() => {
    const loadApiKeys = async () => {
      if (user) {
        // User is logged in - check cloud first, then local for both providers
        try {
          const { Query } = await import('appwrite')

          // Load OpenRouter key
          const openrouterDocs = await databases.listDocuments(
            DATABASE_ID,
            'api_keys',
            [
              Query.equal('userId', user.$id),
              Query.equal('provider', 'openrouter'),
            ],
          )

          if (openrouterDocs.total > 0) {
            const keyDoc = openrouterDocs.documents[0]
            const decryptedKey = decrypt(keyDoc.encryptedKey, user.$id)
            setUserApiKey(decryptedKey)
          } else {
            // No cloud key found, check localStorage
            const savedKey = localStorage.getItem('userOpenRouterApiKey')
            setUserApiKey(savedKey || null)
          }

          // Load OpenAI key
          const openaiDocs = await databases.listDocuments(
            DATABASE_ID,
            'api_keys',
            [
              Query.equal('userId', user.$id),
              Query.equal('provider', 'openai'),
            ],
          )

          if (openaiDocs.total > 0) {
            const keyDoc = openaiDocs.documents[0]
            const decryptedKey = decrypt(keyDoc.encryptedKey, user.$id)
            setUserOpenAiKey(decryptedKey)
          } else {
            // No cloud key found, check localStorage
            const savedKey = localStorage.getItem('userOpenAiApiKey')
            setUserOpenAiKey(savedKey || null)
          }
        } catch (error) {
          console.error('Failed to load cloud API keys:', error)
          // Fallback to localStorage on error
          const openrouterKey = localStorage.getItem('userOpenRouterApiKey')
          const openaiKey = localStorage.getItem('userOpenAiApiKey')
          setUserApiKey(openrouterKey || null)
          setUserOpenAiKey(openaiKey || null)
        }
      } else {
        // Guest mode - only check localStorage
        const openrouterKey = localStorage.getItem('userOpenRouterApiKey')
        const openaiKey = localStorage.getItem('userOpenAiApiKey')
        setUserApiKey(openrouterKey || null)
        setUserOpenAiKey(openaiKey || null)
      }
    }

    loadApiKeys()
  }, [user])

  return {
    userApiKey,
    userOpenAiKey,
    setUserApiKey,
    setUserOpenAiKey,
  }
}
