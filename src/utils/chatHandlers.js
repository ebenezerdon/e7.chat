import { deleteChat, updateChatTitle, getChatsCostOptimized } from '../lib/db'

export const createChatHandlers = ({
  user,
  router,
  currentChatId,
  setCurrentChatId,
  setCurrentChat,
  setChatsData,
  loadChats,
  initializeNewChat,
  openDeleteConfirm,
}) => {
  const handleDeleteChat = () => {
    if (!currentChatId || !user) return
    openDeleteConfirm()
  }

  const handleConfirmDelete = async () => {
    if (!currentChatId || !user) return

    try {
      await deleteChat(user, currentChatId)

      // Get fresh chats data after deletion
      const updatedChats = await getChatsCostOptimized(user)

      // Update local state immediately with fresh data
      setChatsData(updatedChats)

      if (updatedChats.length > 0) {
        // Navigate to first available chat
        router.push(`/?chatId=${updatedChats[0].$id}`)
        setCurrentChatId(updatedChats[0].$id)
      } else {
        // No chats left, clear current state and create new chat
        setCurrentChatId(null)
        setCurrentChat(null)
        // Set empty chats array since we know there are no chats
        setChatsData([])
        await initializeNewChat(true) // Force create, skip reuse logic
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      alert(
        'Failed to delete chat. Please check your connection and try again.',
      )
    }
  }

  const handleDeleteChatFromSidebar = async (chatId) => {
    if (!chatId || !user) return

    try {
      await deleteChat(user, chatId)

      // Get fresh chats data after deletion
      const updatedChats = await getChatsCostOptimized(user)

      // Update local state immediately with fresh data
      setChatsData(updatedChats)

      // If the deleted chat was the current one, navigate to first available chat or create new one if none exist
      if (chatId === currentChatId) {
        if (updatedChats.length > 0) {
          router.push(`/?chatId=${updatedChats[0].$id}`)
          setCurrentChatId(updatedChats[0].$id)
        } else {
          // No chats left, clear current state and create new chat
          setCurrentChatId(null)
          setCurrentChat(null)
          // Set empty chats array since we know there are no chats
          setChatsData([])
          await initializeNewChat(true) // Force create, skip reuse logic
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      alert(
        'Failed to delete chat. Please check your connection and try again.',
      )
    }
  }

  const handleRenameChat = async (chatId, newTitle) => {
    if (!chatId || !user || !newTitle.trim()) return

    try {
      await updateChatTitle(user, chatId, newTitle.trim())

      // Update the chats list locally instead of reloading from server
      setChatsData((prev) =>
        prev.map((chat) =>
          chat.$id === chatId ? { ...chat, title: newTitle.trim() } : chat,
        ),
      )

      // If the renamed chat is the current one, update the current chat title
      if (chatId === currentChatId) {
        setCurrentChat((prev) => ({
          ...prev,
          title: newTitle.trim(),
        }))
      }
    } catch (error) {
      console.error('Failed to rename chat:', error)
      alert(
        'Failed to rename chat. Please check your connection and try again.',
      )
    }
  }

  const handleChatSelect = (chatId) => {
    setCurrentChatId(chatId)
    router.push(`/?chatId=${chatId}`)
  }

  return {
    handleDeleteChat,
    handleConfirmDelete,
    handleDeleteChatFromSidebar,
    handleRenameChat,
    handleChatSelect,
  }
}
