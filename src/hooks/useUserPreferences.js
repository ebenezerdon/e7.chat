import { useState, useEffect } from 'react'
import { saveUserPreference, getUserPreferences } from '../lib/db'

/**
 * Custom hook for managing user preferences
 * @param {Object} user - The authenticated user object
 * @param {Object} account - The account object for saving preferences
 * @returns {Object} - { userPreferences, savePreference }
 */
export const useUserPreferences = (user, account) => {
  const [userPreferences, setUserPreferences] = useState({})

  // Load user preferences when user logs in
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user) {
        try {
          const preferences = await getUserPreferences(account)
          setUserPreferences(preferences)
        } catch (error) {
          console.error('Failed to load user preferences:', error)
        }
      } else {
        // Clear preferences when user logs out
        setUserPreferences({})
      }
    }

    loadUserPreferences()
  }, [user, account])

  // Function to save a preference
  const savePreference = async (key, value) => {
    if (user) {
      try {
        await saveUserPreference(account, key, value)
        setUserPreferences((prev) => ({
          ...prev,
          [key]: value,
        }))
      } catch (error) {
        console.error('Failed to save user preference:', error)
        throw error // Re-throw so calling code can handle
      }
    }
  }

  return {
    userPreferences,
    savePreference,
  }
}
