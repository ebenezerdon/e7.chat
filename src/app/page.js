'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import {
  createChat,
  getChatMessages,
  saveMessage,
  updateChatTitle,
  deleteChat,
  getChat,
  getChatsCostOptimized,
} from '../lib/db'
import { useRouter } from 'next/navigation'
import { SendHorizontal, MinusCircle, LogIn } from 'lucide-react'
import ChatThread from '@/components/ChatThread'
import '../styles/page.css'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '../lib/auth'
import AuthModal from '@/components/AuthModal'
import UserMenu from '@/components/UserMenu'

export default function Chat() {
  const router = useRouter()
  const chatThreadRef = useRef(null)
  const { user } = useAuth()

  const [currentChatId, setCurrentChatId] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [chatsData, setChatsData] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [chatsLoading, setChatsLoading] = useState(true)
  const [savingMessages, setSavingMessages] = useState(new Set())

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    status,
  } = useChat({
    onFinish: (message) => {
      // Save assistant message to database in the background (non-blocking)
      if (currentChatId && message.role === 'assistant' && user) {
        const messageId = message.id || Date.now()
        setSavingMessages((prev) => new Set([...prev, messageId]))

        saveMessage(user, currentChatId, message.role, message.content)
          .then(() => {
            setSavingMessages((prev) => {
              const newSet = new Set(prev)
              newSet.delete(messageId)
              return newSet
            })
          })
          .catch((error) => {
            setSavingMessages((prev) => {
              const newSet = new Set(prev)
              newSet.delete(messageId)
              return newSet
            })
            console.error('Failed to save assistant message:', error)
          })
      }
    },
  })

  const loadChats = useCallback(async () => {
    if (!user) {
      setChatsData([])
      setChatsLoading(false)
      return
    }

    try {
      setChatsLoading(true)
      const chats = await getChatsCostOptimized(user)
      setChatsData(chats)
    } catch (error) {
      console.error('Failed to load chats:', error)
      setChatsData([])
    } finally {
      setChatsLoading(false)
    }
  }, [user])

  const initializeNewChat = useCallback(async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Generate temporary ID for optimistic update
      const tempChatId = `temp-${Date.now()}`
      const now = new Date().toISOString()

      // Create optimistic chat object
      const optimisticChat = {
        $id: tempChatId,
        title: 'New Chat',
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        isArchived: false,
        isPinned: false,
        isOptimistic: true,
      }

      // Immediately update UI with optimistic chat
      setChatsData((prev) => [optimisticChat, ...prev])
      setCurrentChatId(tempChatId)

      // Navigate immediately to provide instant feedback
      router.push(`/?chatId=${tempChatId}`)

      // Clear messages for new chat
      setMessages([])
      setCurrentChat(optimisticChat)

      // Now create the actual chat in the database (background operation)
      const createChatPromise = createChat(user)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Chat creation timeout')), 10000),
      )

      const result = await Promise.race([createChatPromise, timeoutPromise])

      // Replace optimistic chat with real chat data
      setChatsData((prev) =>
        prev.map((chat) =>
          chat.$id === tempChatId
            ? {
                $id: result.$id,
                title: result.title,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                messageCount: 0,
                isArchived: false,
                isPinned: false,
              }
            : chat,
        ),
      )

      // Update current chat ID to real ID
      setCurrentChatId(result.$id)
      setCurrentChat(result)

      // Update URL with real chat ID
      router.replace(`/?chatId=${result.$id}`)
    } catch (error) {
      console.error('Failed to create chat:', error)

      // Rollback optimistic update on error
      setChatsData((prev) => prev.filter((chat) => !chat.isOptimistic))

      // Navigate back to first available chat or home
      const existingChats = chatsData.filter((chat) => !chat.isOptimistic)
      if (existingChats.length > 0) {
        setCurrentChatId(existingChats[0].$id)
        router.push(`/?chatId=${existingChats[0].$id}`)
      } else {
        setCurrentChatId(null)
        router.push('/')
      }

      alert('Failed to create new chat. Please try again.')
    }
  }, [user, router, chatsData, setMessages])

  const generateTitle = async (message) => {
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) throw new Error('Failed to generate title')

      const { title } = await response.json()
      if (title && currentChatId) {
        await updateChatTitle(user, currentChatId, title)

        // Update local state to reflect the new title immediately
        setCurrentChat((prev) => (prev ? { ...prev, title } : null))

        // Also update the chats list to show the new title in sidebar
        setChatsData((prev) =>
          prev.map((chat) =>
            chat.$id === currentChatId ? { ...chat, title } : chat,
          ),
        )
      }
    } catch (error) {
      console.error('Error generating title', error)
    }
  }

  const loadCurrentChat = useCallback(async () => {
    if (!user || !currentChatId) {
      setCurrentChat(null)
      return
    }

    // Don't try to load optimistic chats from database
    if (currentChatId.startsWith('temp-')) {
      return
    }

    try {
      const chat = await getChat(user, currentChatId)
      setCurrentChat(chat)
    } catch (error) {
      console.error('Failed to load current chat:', error)
      setCurrentChat(null)
    }
  }, [user, currentChatId])

  const handleChatSubmit = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (!currentChatId) {
      console.error('No current chat ID available')
      return
    }

    try {
      // Check if we're using an optimistic chat ID
      const isOptimisticChat = currentChatId.startsWith('temp-')

      if (isOptimisticChat) {
        console.warn('Chat is still being created, please wait...')
        return
      }

      const isFirstMessage =
        (await getChatMessages(user, currentChatId)).length === 0

      // Optimistic update: immediately trigger AI response
      handleSubmit()

      // Save user message to database in the background
      const userMessageId = `user-${Date.now()}`
      setSavingMessages((prev) => new Set([...prev, userMessageId]))

      try {
        await saveMessage(user, currentChatId, 'user', input)
        setSavingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(userMessageId)
          return newSet
        })

        if (isFirstMessage) {
          generateTitle(input)
        }
      } catch (error) {
        setSavingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(userMessageId)
          return newSet
        })
        console.error('Failed to save user message:', error)
      }
    } catch (error) {
      console.error('Failed to process message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const handleDeleteChat = useCallback(async () => {
    if (!currentChatId || !user) return

    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteChat(user, currentChatId)

        // Refresh the chats list
        await loadChats()

        // Navigate to first available chat or home
        const updatedChats = await getChatsCostOptimized(user)
        if (updatedChats.length > 0) {
          router.push(`/?chatId=${updatedChats[0].$id}`)
          setCurrentChatId(updatedChats[0].$id)
        } else {
          router.push('/')
          setCurrentChatId(null)
        }
      } catch (error) {
        console.error('Failed to delete chat:', error)
        alert(
          'Failed to delete chat. Please check your connection and try again.',
        )
      }
    }
  }, [currentChatId, user, router, loadChats])

  const handleChatSelect = (chatId) => {
    setCurrentChatId(chatId)
    router.push(`/?chatId=${chatId}`)
  }

  // Load chats when user logs in or out
  useEffect(() => {
    loadChats()
  }, [loadChats])

  // Load current chat details when currentChatId changes
  useEffect(() => {
    loadCurrentChat()
  }, [loadCurrentChat])

  // Handle initial chat selection from URL
  useEffect(() => {
    if (!user) return

    const chatId = new URLSearchParams(window.location.search).get('chatId')

    if (chatId && chatsData.length > 0) {
      // Check if the requested chat exists
      const chatExists = chatsData.find((chat) => chat.$id === chatId)
      if (chatExists) {
        setCurrentChatId(chatId)
      } else {
        // Chat doesn't exist, redirect to first available chat or create new one
        if (chatsData.length > 0) {
          router.push(`/?chatId=${chatsData[0].$id}`)
          setCurrentChatId(chatsData[0].$id)
        } else {
          initializeNewChat()
        }
      }
    } else if (!chatId && chatsData.length > 0) {
      // No chat specified, go to first available
      router.push(`/?chatId=${chatsData[0].$id}`)
      setCurrentChatId(chatsData[0].$id)
    } else if (!chatId && chatsData.length === 0 && !chatsLoading) {
      // No chats exist, create a new one
      initializeNewChat()
    }
  }, [user, chatsData, chatsLoading, router, initializeNewChat])

  // Load messages when currentChatId changes
  useEffect(() => {
    const loadChatMessages = async () => {
      if (!user || !currentChatId) {
        setMessages([])
        return
      }

      // Don't try to load messages for optimistic chats
      if (currentChatId.startsWith('temp-')) {
        setMessages([])
        return
      }

      try {
        const loadedMessages = await getChatMessages(user, currentChatId)
        setMessages(loadedMessages)
      } catch (error) {
        console.error('Failed to load messages', error)
        setMessages([])
      }
    }

    loadChatMessages()
  }, [user, currentChatId, setMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatThreadRef.current && messages.length > 0) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight
    }
  }, [messages, currentChatId])

  if (chatsLoading) {
    return <div className="loading-state">Loading...</div>
  }

  return (
    <div className="chat-container">
      <Sidebar
        fetchedChats={chatsData}
        currentChatId={currentChatId}
        setCurrentChatId={handleChatSelect}
        initializeNewChat={initializeNewChat}
      />
      <div className="chat-main">
        <div className="chat-header">
          <div className="title-group">
            <h1 className="chat-title">
              {currentChat?.title || 'New Chat'}
              {currentChatId?.startsWith('temp-') && (
                <span className="creating-indicator"> (Creating...)</span>
              )}
            </h1>
            <button
              onClick={handleDeleteChat}
              className="delete-button"
              disabled={currentChatId?.startsWith('temp-')}
              aria-label="Delete chat"
            >
              <MinusCircle className="delete-icon" strokeWidth={1.5} />
            </button>
          </div>

          <div className="auth-controls">
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="auth-button"
                aria-label="Sign in"
              >
                <LogIn size={18} />
                Sign In
              </button>
            )}
          </div>
        </div>

        <ChatThread
          messages={messages}
          status={status}
          chatThreadRef={chatThreadRef}
          savingMessages={savingMessages}
        />

        <div className="input-area">
          <form onSubmit={handleChatSubmit} className="input-form">
            <input
              value={input}
              placeholder={
                currentChatId?.startsWith('temp-')
                  ? 'Creating chat...'
                  : 'Message AI Assistant...'
              }
              onChange={handleInputChange}
              disabled={
                (status !== 'ready' && status !== undefined) ||
                currentChatId?.startsWith('temp-')
              }
              className="input-field"
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={
                !input.trim() ||
                status === 'submitted' ||
                status === 'streaming' ||
                currentChatId?.startsWith('temp-')
              }
              className="submit-button"
              aria-label="Send message"
            >
              <SendHorizontal className="submit-icon" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}
