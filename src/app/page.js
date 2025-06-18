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
  getChats,
} from '../lib/db'
import { databases, DATABASE_ID, account } from '../lib/appwrite'
import { useRouter } from 'next/navigation'
import {
  SendHorizontal,
  MinusCircle,
  LogIn,
  Share2,
  Key,
  CornerUpRight,
} from 'lucide-react'
import ChatThread from '@/components/ChatThread'
import '../styles/page.css'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '../lib/auth'
import AuthModal from '@/components/AuthModal'
import UserMenu from '@/components/UserMenu'
import ModelSelector from '@/components/ModelSelector'
import FileUpload from '@/components/FileUpload'
import AttachmentCount from '@/components/AttachmentCount'
import ShareModal from '@/components/ShareModal'
import ApiKeyModal from '@/components/ApiKeyModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import { detectImageRequest } from '../utils/imageDetection'
import {
  generateVersionedTitle,
  generateTitle,
  loadChats,
  loadCurrentChat,
} from '../utils/chatHelpers'
import { handleImageGeneration } from '../utils/imageHandlers'
import { handleRegenerate } from '../utils/regenerateHandlers'
import { useApiKeys } from '../hooks/useApiKeys'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { useModals } from '../hooks/useModals'
import { useChatState } from '../hooks/useChatState'
import { useModelSelection } from '../hooks/useModelSelection'
import { createChatHandlers } from '../utils/chatHandlers'

export default function Chat() {
  const router = useRouter()
  const chatThreadRef = useRef(null)
  const { user, loading: authLoading } = useAuth()

  // Chat state management
  const {
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
    savingMessages,
    setSavingMessages,
    updateSavingMessages,
    regeneratingMessageIndex,
    setRegeneratingMessageIndex,
  } = useChatState()

  // Modal management
  const {
    showAuthModal,
    showShareModal,
    showApiKeyModal,
    showDeleteConfirm,
    openAuthModal,
    closeAuthModal,
    openShareModal,
    closeShareModal,
    openApiKeyModal,
    closeApiKeyModal,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useModals()

  // API keys management
  const { userApiKey, userOpenAiKey, setUserApiKey, setUserOpenAiKey } =
    useApiKeys(user)

  // User preferences management
  const { userPreferences, savePreference } = useUserPreferences(user, account)

  // Model selection and file attachments
  const {
    selectedModel,
    setSelectedModel,
    attachedFiles,
    setAttachedFiles,
    handleModelChange,
    getDefaultModel,
  } = useModelSelection(userApiKey, userPreferences, savePreference, user)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    setInput,
    status,
  } = useChat({
    body: {
      model: selectedModel,
    },
    headers: {
      ...(userApiKey && { 'X-User-API-Key': userApiKey }),
    },
    onFinish: (message) => {
      // Clear attachments after message is sent
      setAttachedFiles(null)

      // Save assistant message to database in the background (non-blocking)
      if (currentChatId && message.role === 'assistant' && user) {
        const messageId = message.id || Date.now()
        setSavingMessages((prev) => new Set([...prev, messageId]))

        saveMessage(
          user,
          currentChatId,
          message.role,
          message.content,
          selectedModel,
        )
          .then(() => {
            // Update the message in UI state to include model information
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message.id ? { ...msg, model: selectedModel } : msg,
              ),
            )

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

  const loadChatsCallback = useCallback(async () => {
    await loadChats(user, setChatsData, setChatsLoading)
  }, [user])

  const initializeNewChat = useCallback(
    async (forceCreate = false) => {
      if (!user) {
        openAuthModal()
        return
      }

      try {
        // If forceCreate is true (e.g., user explicitly clicked "New Chat"), skip reuse logic
        if (!forceCreate) {
          // 1) Try to find an existing unused "New Chat" first (both in current state and freshly fetched)
          const findUnusedNewChat = (chats) =>
            chats?.find(
              (chat) =>
                chat.title === 'New Chat' &&
                (chat.messageCount === 0 || chat.messageCount === undefined),
            )

          // Check the local state first
          let reusableChat = findUnusedNewChat(chatsData)

          if (!reusableChat) {
            // Fetch latest chats from server in case local state is stale
            try {
              const latestChats = await getChatsCostOptimized(user)
              // Update local state with latest chats (non-blocking)
              setChatsData(latestChats)
              reusableChat = findUnusedNewChat(latestChats)
            } catch (err) {
              console.error(
                'Failed to fetch latest chats before creating new one',
                err,
              )
            }
          }

          // Final fallback: perform a direct query to the main chats collection
          if (!reusableChat) {
            try {
              const fullChats = await getChats(user)
              reusableChat = findUnusedNewChat(fullChats)
              if (reusableChat) {
                // Merge fullChats into local state to keep UI up-to-date
                setChatsData(fullChats)
              }
            } catch (err) {
              console.error('Failed full chat fetch fallback', err)
            }
          }

          // If we found an unused chat, just navigate to it instead of creating a new one
          if (reusableChat) {
            setCurrentChatId(reusableChat.$id)
            router.push(`/?chatId=${reusableChat.$id}`)
            setCurrentChat(reusableChat)
            setMessages([])
            return
          }
        }

        // --- Original optimistic creation flow starts here ---
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
    },
    [user, router, chatsData, setMessages, getChatsCostOptimized],
  )

  const loadCurrentChatCallback = useCallback(async () => {
    await loadCurrentChat(user, currentChatId, setCurrentChat)
  }, [user, currentChatId])

  // Create chat handlers
  const {
    handleDeleteChat,
    handleConfirmDelete,
    handleDeleteChatFromSidebar,
    handleRenameChat,
    handleChatSelect,
  } = createChatHandlers({
    user,
    router,
    currentChatId,
    setCurrentChatId,
    setCurrentChat,
    setChatsData,
    loadChats: loadChatsCallback,
    initializeNewChat,
    openDeleteConfirm,
  })

  const handleChatSubmit = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    if (!user) {
      openAuthModal()
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

      // Check if this is an image generation request (only if no attachments)
      const imagePrompt = detectImageRequest(input)

      if (imagePrompt && (!attachedFiles || attachedFiles.length === 0)) {
        console.log('Image request detected:', imagePrompt)
        // Clear input immediately for better UX
        setInput('')
        // Handle image generation
        await handleImageGeneration(
          imagePrompt,
          input,
          user,
          currentChatId,
          userOpenAiKey,
          messages,
          setMessages,
          userApiKey,
          updateChatTitle,
          setCurrentChat,
          setChatsData,
          openAuthModal,
        )
        return
      }

      const isFirstMessage =
        (await getChatMessages(user, currentChatId)).length === 0

      // Prepare user message content for database storage
      let userMessageContent = input
      if (attachedFiles && attachedFiles.length > 0) {
        const attachmentSummary = Array.from(attachedFiles)
          .map(
            (file) =>
              `${file.type.startsWith('image/') ? '📷' : '📄'} ${file.name}`,
          )
          .join(', ')
        userMessageContent += `\n\n[Attachments: ${attachmentSummary}]`
      }

      // Use handleSubmit with experimental_attachments for AI SDK
      handleSubmit(e, {
        experimental_attachments: attachedFiles,
      })

      // Save user message to database in the background
      const userMessageId = `user-${Date.now()}`
      setSavingMessages((prev) => new Set([...prev, userMessageId]))

      try {
        await saveMessage(user, currentChatId, 'user', userMessageContent, null)
        setSavingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(userMessageId)
          return newSet
        })

        if (isFirstMessage) {
          generateTitle(
            input,
            userApiKey,
            user,
            currentChatId,
            updateChatTitle,
            setCurrentChat,
            setChatsData,
          )
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

  // Load chats when user logs in or out
  useEffect(() => {
    loadChatsCallback()
  }, [loadChatsCallback])

  // Load current chat details when currentChatId changes
  useEffect(() => {
    loadCurrentChatCallback()
  }, [loadCurrentChatCallback])

  // Handle initial chat selection from URL
  useEffect(() => {
    if (authLoading || !user) return

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
      // No chat specified - check if most recent chat is an unused "New Chat"
      const mostRecentChat = chatsData[0] // chats are sorted by createdAt desc
      const isUnusedNewChat =
        mostRecentChat.title === 'New Chat' &&
        (mostRecentChat.messageCount === 0 ||
          mostRecentChat.messageCount === undefined)

      if (isUnusedNewChat) {
        // Reuse the existing unused "New Chat"
        router.push(`/?chatId=${mostRecentChat.$id}`)
        setCurrentChatId(mostRecentChat.$id)
      } else {
        // Go to first available chat (most recent)
        router.push(`/?chatId=${chatsData[0].$id}`)
        setCurrentChatId(chatsData[0].$id)
      }
    } else if (!chatId && chatsData.length === 0 && !chatsLoading) {
      // No chats exist, create a new one
      initializeNewChat()
    }
  }, [authLoading, user, chatsData, chatsLoading, router, initializeNewChat])

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

        // Parse image messages that were stored as JSON
        const parsedMessages = loadedMessages.map((message) => {
          if (
            message.role === 'assistant' &&
            typeof message.content === 'string' &&
            message.content.startsWith('{')
          ) {
            try {
              const parsed = JSON.parse(message.content)
              if (parsed.type && parsed.imageData) {
                return {
                  ...message,
                  content: parsed.content,
                  type: parsed.type,
                  imageData: parsed.imageData,
                }
              }
            } catch (e) {
              console.log('Failed to parse message as JSON:', e)
            }
          }
          return message
        })

        setMessages(parsedMessages)
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

  if (authLoading || chatsLoading) {
    return <div className="loading-state"></div>
  }

  return (
    <div className="chat-container">
      <Sidebar
        fetchedChats={chatsData}
        currentChatId={currentChatId}
        setCurrentChatId={handleChatSelect}
        initializeNewChat={initializeNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChatFromSidebar}
      />
      <div className="chat-main">
        <div className="chat-header">
          {/* Mobile: Navigation controls only */}
          <div className="nav-controls">
            <div className="auth-controls">
              {user && userApiKey && (
                <button
                  onClick={openApiKeyModal}
                  className="api-key-indicator"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'
                  }}
                  title="Manage your personal OpenRouter API key (synced across devices)"
                >
                  <Key size={14} />
                  <span>Personal Key</span>
                </button>
              )}
              {!user && userApiKey && (
                <div
                  className="api-key-indicator"
                  title="Using your personal OpenRouter API key (local only)"
                  style={{
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b/20',
                  }}
                >
                  <Key size={14} />
                  <span>Local Key</span>
                </div>
              )}
              {user && !userApiKey && (
                <button
                  onClick={openApiKeyModal}
                  className="api-key-indicator"
                  style={{
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(245, 158, 11, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent'
                  }}
                  title="Add your personal OpenRouter API key for better performance"
                >
                  <Key size={14} />
                  <span>Add API Key</span>
                </button>
              )}
              {user &&
                currentChatId &&
                !currentChatId.startsWith('temp-') &&
                messages.length > 0 && (
                  <button
                    onClick={openShareModal}
                    className="share-button-small"
                    aria-label="Share chat"
                  >
                    <Share2 className="share-icon-small" strokeWidth={1.5} />
                  </button>
                )}
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={openAuthModal}
                  className="auth-button"
                  aria-label="Sign in"
                >
                  <LogIn size={18} />
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Mobile: Title row - separate row on mobile */}
          <div className="title-row">
            <div className="title-group">
              <h1 className="chat-title">
                {currentChat?.title || 'New Chat'}
                {currentChatId?.startsWith('temp-') && (
                  <span className="creating-indicator"> (Creating...)</span>
                )}
                {currentChat?.isBranch && currentChat?.parentChatId && (
                  <button
                    onClick={() => handleChatSelect(currentChat.parentChatId)}
                    className="parent-chat-link"
                    title={`Go to parent chat: ${
                      currentChat?.parentChatTitle || 'Parent Chat'
                    }`}
                  >
                    <CornerUpRight size={12} strokeWidth={1.5} />
                    <span>Go to parent branch</span>
                  </button>
                )}
              </h1>
              <div className="header-actions">
                <button
                  onClick={handleDeleteChat}
                  className="delete-button"
                  disabled={currentChatId?.startsWith('temp-')}
                  aria-label="Delete chat"
                >
                  <MinusCircle className="delete-icon" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop */}
          <div className="title-group">
            <h1 className="chat-title">
              {currentChat?.title || 'New Chat'}
              {currentChatId?.startsWith('temp-') && (
                <span className="creating-indicator"> (Creating...)</span>
              )}
              {currentChat?.isBranch && currentChat?.parentChatId && (
                <button
                  onClick={() => handleChatSelect(currentChat.parentChatId)}
                  className="parent-chat-link"
                  title={`Go to parent chat: ${
                    currentChat?.parentChatTitle || 'Parent Chat'
                  }`}
                >
                  <CornerUpRight size={12} strokeWidth={1.5} />
                  <span>Go to parent branch</span>
                </button>
              )}
            </h1>
            <div className="header-actions">
              <button
                onClick={handleDeleteChat}
                className="delete-button"
                disabled={currentChatId?.startsWith('temp-')}
                aria-label="Delete chat"
              >
                <MinusCircle className="delete-icon" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="auth-controls">
            {user && userApiKey && (
              <button
                onClick={openApiKeyModal}
                className="api-key-indicator"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'
                }}
                title="Manage your personal OpenRouter API key (synced across devices)"
              >
                <Key size={14} />
                <span>Personal Key</span>
              </button>
            )}
            {!user && userApiKey && (
              <div
                className="api-key-indicator"
                title="Using your personal OpenRouter API key (local only)"
                style={{
                  borderColor: '#f59e0b',
                  backgroundColor: '#f59e0b/20',
                }}
              >
                <Key size={14} />
                <span>Local Key</span>
              </div>
            )}
            {user && !userApiKey && (
              <button
                onClick={openApiKeyModal}
                className="api-key-indicator"
                style={{
                  borderColor: '#f59e0b',
                  backgroundColor: 'transparent',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(245, 158, 11, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                }}
                title="Add your personal OpenRouter API key for better performance"
              >
                <Key size={14} />
                <span>Add API Key</span>
              </button>
            )}
            {user &&
              currentChatId &&
              !currentChatId.startsWith('temp-') &&
              messages.length > 0 && (
                <button
                  onClick={openShareModal}
                  className="share-button-small"
                  aria-label="Share chat"
                >
                  <Share2 className="share-icon-small" strokeWidth={1.5} />
                </button>
              )}
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={openAuthModal}
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
          onRegenerate={(messageIndex, modelId, createNewChat = false) =>
            handleRegenerate(
              messageIndex,
              modelId,
              createNewChat,
              user,
              currentChatId,
              currentChat,
              messages,
              userApiKey,
              setRegeneratingMessageIndex,
              setMessages,
              setCurrentChatId,
              setCurrentChat,
              setSavingMessages,
              setChatsData,
              setChatsLoading,
              router,
            )
          }
          regeneratingMessageIndex={regeneratingMessageIndex}
        />

        <div className="input-area">
          {/* Attachments display above input */}
          {attachedFiles && attachedFiles.length > 0 && (
            <div className="flex justify-start px-4 pb-2">
              <AttachmentCount
                files={attachedFiles}
                onClear={() => setAttachedFiles(null)}
              />
            </div>
          )}

          <form onSubmit={handleChatSubmit} className="input-form">
            {/* Main input row - always has FileUpload + Input + Send button */}
            <div className="mobile-input-row">
              {/* Desktop model selector - hidden on mobile */}
              <div className="hidden sm:block">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  hasApiKey={!!userApiKey}
                  onApiKeyRequired={openApiKeyModal}
                />
              </div>

              <FileUpload
                files={attachedFiles}
                onFilesChange={setAttachedFiles}
                showAttachmentsList={false}
              />

              <input
                value={input}
                placeholder={
                  currentChatId?.startsWith('temp-')
                    ? 'Creating chat...'
                    : 'Message AI Assistant or ask to generate an image...'
                }
                onChange={handleInputChange}
                disabled={
                  (status !== 'ready' && status !== undefined) ||
                  currentChatId?.startsWith('temp-')
                }
                className="input-field"
                aria-label="Chat input"
              />

              {/* Single send button - always beside input */}
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
            </div>

            {/* Mobile model selector row - only shown on mobile */}
            <div className="mobile-bottom-row sm:hidden">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                hasApiKey={!!userApiKey}
                onApiKeyRequired={openApiKeyModal}
              />
            </div>
          </form>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />

      <ShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        chatId={currentChatId}
        chatTitle={currentChat?.title}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={closeApiKeyModal}
        user={user}
        onSave={(provider, apiKey, keyData, synced) => {
          if (provider === 'openrouter') {
            setUserApiKey(apiKey)
          } else if (provider === 'openai') {
            setUserOpenAiKey(apiKey)
          }
          // Don't close modal automatically - let user manage multiple keys
        }}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
