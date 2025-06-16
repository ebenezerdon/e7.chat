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
  getChats,
  syncToCloud,
} from '../lib/hybrid-db'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { SendHorizontal, MinusCircle, LogIn } from 'lucide-react'
import ChatThread from '@/components/ChatThread'
import '../styles/page.css'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '../lib/auth'
import AuthModal from '@/components/AuthModal'
import UserMenu from '@/components/UserMenu'
import { db } from '../lib/db'

export default function Chat() {
  const router = useRouter()
  const chatThreadRef = useRef(null)
  const { user, loading } = useAuth()

  const [currentChatId, setCurrentChatId] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [chatsData, setChatsData] = useState([])

  const fetchedChats = useLiveQuery(() =>
    db.chats.orderBy('createdAt').reverse().toArray(),
  )

  const currentChat = useLiveQuery(
    () => db.chats.get(Number(currentChatId)),
    [currentChatId],
  )

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    status,
  } = useChat({
    onFinish: async (message) => {
      if (currentChatId && message.role === 'assistant') {
        await saveMessage(user, currentChatId, message.role, message.content)
      }
    },
  })

  const navigateToChat = useCallback(
    (chatId) => {
      router.push(`/?chatId=${chatId}`)
      setCurrentChatId(chatId)
    },
    [router],
  )

  const initializeNewChat = useCallback(async () => {
    const result = await createChat(user)
    navigateToChat(result.localId)
  }, [navigateToChat, user])

  const setActiveChat = useCallback(
    async (requestedChatId = null) => {
      if (fetchedChats && fetchedChats?.length === 0) {
        return initializeNewChat()
      }

      if (requestedChatId) navigateToChat(Number(requestedChatId))
      else navigateToChat(fetchedChats?.[0].id)
    },
    [navigateToChat, initializeNewChat, fetchedChats],
  )

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
      }
    } catch (error) {
      console.error('Error generating title', error)
    }
  }

  // Sync with cloud when user logs in
  useEffect(() => {
    if (user && !loading) {
      syncToCloud(user)
      loadChats()
    }
  }, [user, loading])

  const loadChats = useCallback(async () => {
    try {
      const chats = await getChats(user)
      setChatsData(chats)
    } catch (error) {
      console.error('Failed to load chats:', error)
    }
  }, [user])

  useEffect(() => {
    if (!fetchedChats) return

    if (!currentChatId) {
      const chatId = new URLSearchParams(window.location.search).get('chatId')
      setActiveChat(chatId)
    }

    const loadChatMessages = async () => {
      try {
        const loadedMessages = await getChatMessages(user, currentChatId)
        setMessages(loadedMessages)
      } catch (error) {
        console.error('Failed to load messages', error)
      }
    }

    loadChatMessages()
  }, [fetchedChats, currentChatId, setActiveChat, setMessages, user])

  useEffect(() => {
    if (chatThreadRef.current && messages.length > 0) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight
    }
  }, [messages, currentChatId])

  const handleChatSubmit = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    const isFirstMessage =
      (await getChatMessages(user, currentChatId)).length === 0

    await saveMessage(user, currentChatId, 'user', input)

    if (isFirstMessage) generateTitle(input)

    handleSubmit()
  }

  const handleDeleteChat = useCallback(async () => {
    if (!currentChatId) return

    if (window.confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(user, currentChatId)
      router.push('/')
      setCurrentChatId(null)
    }
  }, [currentChatId, router, user])

  if (!fetchedChats) {
    return <div className="loading-state">Loading...</div>
  }

  return (
    <div className="chat-container">
      <Sidebar
        fetchedChats={fetchedChats}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        initializeNewChat={initializeNewChat}
      />
      <div className="chat-main">
        <div className="chat-header">
          <div className="title-group">
            <h1 className="chat-title">{currentChat?.title || 'New Chat'}</h1>
            <button
              onClick={handleDeleteChat}
              className="delete-button"
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
        />

        <div className="input-area">
          <form onSubmit={handleChatSubmit} className="input-form">
            <input
              value={input}
              placeholder="Message AI Assistant..."
              onChange={handleInputChange}
              disabled={status !== 'ready' && status !== undefined}
              className="input-field"
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={
                !input.trim() ||
                status === 'submitted' ||
                status === 'streaming'
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
