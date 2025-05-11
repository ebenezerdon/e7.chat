'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import {
  db,
  createChat,
  getChatMessages,
  saveMessage,
  updateChatTitle,
  deleteChat,
  getChat,
} from '../lib/db'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { SendHorizontal, MinusCircle } from 'lucide-react'
import ChatThread from '@/components/ChatThread'
import '../styles/page.css'
import Sidebar from '@/components/Sidebar'

export default function Chat() {
  const router = useRouter()
  const chatThreadRef = useRef(null)

  const [currentChatId, setCurrentChatId] = useState(null)

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
        await saveMessage(currentChatId, message.role, message.content)
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
    const chatId = await createChat()
    navigateToChat(chatId)
  }, [navigateToChat])

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
        await updateChatTitle(currentChatId, title)
      }
    } catch (error) {
      console.error('Error generating title', error)
    }
  }

  useEffect(() => {
    if (!fetchedChats) return

    if (!currentChatId) {
      const chatId = new URLSearchParams(window.location.search).get('chatId')
      setActiveChat(chatId)
    }

    const loadChatMessages = async () => {
      try {
        const loadedMessages = await getChatMessages(currentChatId)
        setMessages(loadedMessages)
      } catch (error) {
        console.error('Failed to load messages', error)
      }
    }

    loadChatMessages()
  }, [fetchedChats, currentChatId, setActiveChat, setMessages])

  useEffect(() => {
    if (chatThreadRef.current && messages.length > 0) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight
    }
  }, [messages, currentChatId])

  const handleChatSubmit = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    const isFirstMessage = (await getChatMessages(currentChatId)).length === 0

    await saveMessage(currentChatId, 'user', input)

    if (isFirstMessage) generateTitle(input)

    handleSubmit()
  }

  const handleDeleteChat = useCallback(async () => {
    if (!currentChatId) return

    if (window.confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(currentChatId)
      router.push('/')
      setCurrentChatId(null)
    }
  }, [currentChatId, router])

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
    </div>
  )
}
