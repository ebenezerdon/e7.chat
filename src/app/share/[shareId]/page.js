'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, AlertCircle } from 'lucide-react'
import { getSharedChat, getSharedChatMessages } from '../../../lib/db'
import ChatThread from '../../../components/ChatThread'
import '../../../styles/page.css'

const SharedChatPage = () => {
  const params = useParams()
  const shareId = params?.shareId

  const [sharedChat, setSharedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const chatThreadRef = useRef(null)

  useEffect(() => {
    if (shareId) {
      loadSharedChat()
    }
  }, [shareId])

  const loadSharedChat = async () => {
    try {
      setLoading(true)
      setError('')

      // Get the shared chat data
      const chatData = await getSharedChat(shareId)
      if (!chatData) {
        setError('This shared chat was not found or is no longer available.')
        return
      }

      setSharedChat(chatData)

      // Get the messages
      const chatMessages = await getSharedChatMessages(shareId)
      setMessages(chatMessages)
    } catch (error) {
      console.error('Error loading shared chat:', error)
      setError('Failed to load the shared chat. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading-state">Loading shared chat...</div>
  }

  if (error) {
    return (
      <div className="loading-state">
        <div style={{ textAlign: 'center' }}>
          <AlertCircle
            size={48}
            className="text-red-500"
            style={{ margin: '0 auto 16px' }}
          />
          <h2 style={{ marginBottom: '8px' }}>Chat Not Found</h2>
          <p style={{ marginBottom: '24px', color: '#9ca3af' }}>{error}</p>
          <Link
            href="/"
            style={{
              background: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ExternalLink size={16} />
            Go to e7.chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      {/* No sidebar for shared chats - just the main content */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="title-group">
            <h1 className="chat-title">
              {sharedChat?.title || 'Shared Conversation'}
              <span
                style={{
                  fontSize: '14px',
                  color: '#9ca3af',
                  fontWeight: 'normal',
                  marginLeft: '12px',
                }}
              >
                Shared by {sharedChat?.sharedBy} •{' '}
                {new Date(sharedChat?.sharedAt).toLocaleDateString()}
              </span>
            </h1>
          </div>

          <div className="auth-controls">
            <Link
              href="/"
              style={{
                background: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ExternalLink size={16} />
              Start Your Own Chat
            </Link>
          </div>
        </div>

        <ChatThread
          messages={messages}
          status="idle"
          chatThreadRef={chatThreadRef}
          savingMessages={new Set()}
          onRegenerate={null}
          regeneratingMessageIndex={null}
        />

        {/* Simple read-only notice instead of input area */}
        <div
          className="input-area"
          style={{
            justifyContent: 'center',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <div style={{ color: '#9ca3af', fontSize: '14px' }}>
            This is a read-only view of a shared conversation.{' '}
            <Link href="/" style={{ color: '#60a5fa', textDecoration: 'none' }}>
              Create your own AI chat →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SharedChatPage
