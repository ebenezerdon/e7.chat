import { useState, useEffect, useCallback } from 'react'

export const useModelSelection = (
  userApiKey,
  userPreferences,
  savePreference,
  user,
) => {
  // Function to get smart default model based on preferences and API key
  const getDefaultModel = useCallback(() => {
    // Priority: saved preference > API key based default > fallback
    if (userPreferences.lastUsedModel) {
      return userPreferences.lastUsedModel
    }
    return userApiKey ? 'openai/gpt-4o' : 'openai/gpt-4o-mini'
  }, [userPreferences.lastUsedModel, userApiKey])

  // LLM model selection state (simplified for OpenRouter)
  const [selectedModel, setSelectedModel] = useState(
    userApiKey ? 'openai/gpt-4o' : 'openai/gpt-4o-mini',
  )

  // File attachments state
  const [attachedFiles, setAttachedFiles] = useState(null)

  // Handle model selection with preference saving
  const handleModelChange = useCallback(
    async (newModel) => {
      setSelectedModel(newModel)

      // Save user preference if user is logged in
      if (user) {
        try {
          await savePreference('lastUsedModel', newModel)
        } catch (error) {
          console.error('Failed to save model preference:', error)
          // Continue anyway - don't block user from using the model
        }
      }
    },
    [user, savePreference],
  )

  // Update selected model when preferences change
  useEffect(() => {
    if (userPreferences.lastUsedModel) {
      setSelectedModel(userPreferences.lastUsedModel)
    }
  }, [userPreferences.lastUsedModel])

  // Update default model when API key status changes (only if no saved preference)
  useEffect(() => {
    // Don't override if user has a saved preference
    if (userPreferences.lastUsedModel) return

    // Only update if user doesn't have a manually selected model preference
    if (userApiKey && selectedModel === 'openai/gpt-4o-mini') {
      setSelectedModel('openai/gpt-4o')
    } else if (!userApiKey && selectedModel !== 'openai/gpt-4o-mini') {
      // When API key is removed, fall back to free tier model
      setSelectedModel('openai/gpt-4o-mini')
    }
  }, [userApiKey, selectedModel, userPreferences.lastUsedModel])

  return {
    selectedModel,
    setSelectedModel,
    attachedFiles,
    setAttachedFiles,
    handleModelChange,
    getDefaultModel,
  }
}
