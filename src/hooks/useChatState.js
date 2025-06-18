import { useState, useCallback } from 'react'

export const useChatState = () => {
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chatsData, setChatsData] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [chatsLoading, setChatsLoading] = useState(true)
  const [savingMessages, setSavingMessages] = useState(new Set())
  const [regeneratingMessageIndex, setRegeneratingMessageIndex] = useState(null)

  const updateChatsData = useCallback((updater) => {
    setChatsData(updater)
  }, [])

  const updateCurrentChat = useCallback((updater) => {
    setCurrentChat(updater)
  }, [])

  const updateSavingMessages = useCallback((updater) => {
    setSavingMessages(updater)
  }, [])

  return {
    // Chat state
    currentChatId,
    setCurrentChatId,
    chatsData,
    setChatsData,
    updateChatsData,
    currentChat,
    setCurrentChat,
    updateCurrentChat,
    chatsLoading,
    setChatsLoading,

    // Message state
    savingMessages,
    setSavingMessages,
    updateSavingMessages,
    regeneratingMessageIndex,
    setRegeneratingMessageIndex,
  }
}
