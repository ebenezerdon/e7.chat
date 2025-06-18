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
  saveUserPreference,
  getUserPreferences,
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
import { generateVersionedTitle } from '../utils/chatHelpers'
import { useApiKeys } from '../hooks/useApiKeys'

export default function Chat() {
  const router = useRouter()
  const chatThreadRef = useRef(null)
  const { user, loading: authLoading } = useAuth()

  const [currentChatId, setCurrentChatId] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [chatsData, setChatsData] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [chatsLoading, setChatsLoading] = useState(true)
  const [savingMessages, setSavingMessages] = useState(new Set())

  // API keys management
  const { userApiKey, userOpenAiKey, setUserApiKey, setUserOpenAiKey } =
    useApiKeys(user)

  // File attachments state
  const [attachedFiles, setAttachedFiles] = useState(null)

  // User preferences state
  const [userPreferences, setUserPreferences] = useState({})

  // Function to get smart default model based on preferences and API key
  const getDefaultModel = () => {
    // Priority: saved preference > API key based default > fallback
    if (userPreferences.lastUsedModel) {
      return userPreferences.lastUsedModel
    }
    return userApiKey ? 'openai/gpt-4o' : 'openai/gpt-4o-mini'
  }

  // LLM model selection state (simplified for OpenRouter)
  const [selectedModel, setSelectedModel] = useState(
    userApiKey ? 'openai/gpt-4o' : 'openai/gpt-4o-mini',
  )

  // Regenerate state
  const [regeneratingMessageIndex, setRegeneratingMessageIndex] = useState(null)

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

  const initializeNewChat = useCallback(
    async (forceCreate = false) => {
      if (!user) {
        setShowAuthModal(true)
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

  const generateTitle = async (message) => {
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userApiKey && { 'X-User-API-Key': userApiKey }),
        },
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

  const handleImageGeneration = async (prompt, originalMessage) => {
    if (!user || !currentChatId) {
      setShowAuthModal(true)
      return
    }

    try {
      console.log('Generating image for prompt:', prompt)
      console.log(
        'Using OpenAI API key:',
        userOpenAiKey ? 'User key present' : 'No user key',
      )
      console.log(
        'User object:',
        user ? { id: user.$id, email: user.email } : 'No user',
      )

      // Add user message to chat immediately
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: originalMessage,
        type: 'image-request',
      }

      // Add a loading message for the assistant
      const loadingMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Generating image...',
        type: 'image-generating',
        imagePrompt: prompt,
      }

      setMessages((prev) => [...prev, userMessage, loadingMessage])

      // Save user message to database
      await saveMessage(
        user,
        currentChatId,
        userMessage.role,
        userMessage.content,
      )

      // Generate image
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userOpenAiKey && { 'X-User-API-Key': userOpenAiKey }),
          ...(user && { 'X-User-ID': user.$id }),
        },
        body: JSON.stringify({
          prompt: prompt,
          size: '1024x1024',
          quality: 'auto',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image')
      }

      const imageData = {
        url: data.imageUrl,
        prompt: prompt,
        revisedPrompt: data.revisedPrompt,
        timestamp: new Date().toISOString(),
      }

      // Replace loading message with actual image
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I've generated an image based on your request: "${prompt}"`,
        type: 'image-response',
        imageData: imageData,
      }

      setMessages((prev) => {
        const newMessages = [...prev]
        // Replace the loading message with the actual result
        newMessages[newMessages.length - 1] = assistantMessage
        return newMessages
      })

      // Save assistant message with image data to database
      const assistantMessageData = {
        content: assistantMessage.content,
        type: assistantMessage.type,
        imageData: assistantMessage.imageData,
      }

      await saveMessage(
        user,
        currentChatId,
        assistantMessage.role,
        JSON.stringify(assistantMessageData),
      )

      // Generate title if this is the first interaction
      if (messages.length === 0) {
        await generateTitle(originalMessage)
      }
    } catch (error) {
      console.error('Image generation failed:', error)

      // Replace loading message with error message
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I couldn't generate the image. Error: ${error.message}`,
          type: 'error',
        }
        return newMessages
      })
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

      // Check if this is an image generation request (only if no attachments)
      const imagePrompt = detectImageRequest(input)

      if (imagePrompt && (!attachedFiles || attachedFiles.length === 0)) {
        console.log('Image request detected:', imagePrompt)
        // Clear input immediately for better UX
        setInput('')
        // Handle image generation
        await handleImageGeneration(imagePrompt, input)
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

  const handleDeleteChat = useCallback(() => {
    if (!currentChatId || !user) return
    setShowDeleteConfirm(true)
  }, [currentChatId, user])

  const handleConfirmDelete = useCallback(async () => {
    if (!currentChatId || !user) return

    try {
      await deleteChat(user, currentChatId)

      // Refresh the chats list
      await loadChats()

      // Navigate to first available chat or create new one if none exist
      const updatedChats = await getChatsCostOptimized(user)
      if (updatedChats.length > 0) {
        router.push(`/?chatId=${updatedChats[0].$id}`)
        setCurrentChatId(updatedChats[0].$id)
      } else {
        // No chats left, create a new one
        initializeNewChat()
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      alert(
        'Failed to delete chat. Please check your connection and try again.',
      )
    }
  }, [currentChatId, user, router, loadChats, initializeNewChat])

  const handleDeleteChatFromSidebar = useCallback(
    async (chatId) => {
      if (!chatId || !user) return

      try {
        await deleteChat(user, chatId)

        // Refresh the chats list
        await loadChats()

        // If the deleted chat was the current one, navigate to first available chat or create new one if none exist
        if (chatId === currentChatId) {
          const updatedChats = await getChatsCostOptimized(user)
          if (updatedChats.length > 0) {
            router.push(`/?chatId=${updatedChats[0].$id}`)
            setCurrentChatId(updatedChats[0].$id)
          } else {
            // No chats left, create a new one
            initializeNewChat()
          }
        }
      } catch (error) {
        console.error('Failed to delete chat:', error)
        alert(
          'Failed to delete chat. Please check your connection and try again.',
        )
      }
    },
    [user, router, loadChats, currentChatId, initializeNewChat],
  )

  const handleRenameChat = useCallback(
    async (chatId, newTitle) => {
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
    },
    [user, currentChatId],
  )

  const handleChatSelect = (chatId) => {
    setCurrentChatId(chatId)
    router.push(`/?chatId=${chatId}`)
  }

  // Handle model selection with preference saving
  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel)

    // Save user preference if user is logged in
    if (user) {
      try {
        await saveUserPreference(account, 'lastUsedModel', newModel)
        setUserPreferences((prev) => ({
          ...prev,
          lastUsedModel: newModel,
        }))
      } catch (error) {
        console.error('Failed to save model preference:', error)
        // Continue anyway - don't block user from using the model
      }
    }
  }

  const handleRegenerate = async (
    messageIndex,
    modelId,
    createNewChat = false,
  ) => {
    if (!user || !currentChatId || messageIndex === undefined) return

    try {
      setRegeneratingMessageIndex(messageIndex)

      // Get all messages up to the message being regenerated (excluding the AI response)
      const messagesToRegenerate = messages.slice(0, messageIndex)

      // Make sure we have at least one user message to regenerate from
      if (messagesToRegenerate.length === 0) {
        throw new Error('No messages to regenerate from')
      }

      // Determine the target chat ID for regeneration
      let regenerationChatId = currentChatId
      let regenerationChat = currentChat

      // If creating new chat, handle branching
      if (createNewChat) {
        // Generate versioned title for the branched chat
        const branchedTitle = generateVersionedTitle(
          currentChat?.title || 'New Chat',
        )

        // Create a new chat with versioned title
        const newChat = await createChat(user, branchedTitle, {
          isBranch: true,
          parentChatId: currentChatId,
          parentChatTitle: currentChat?.title || 'Chat',
        })

        // Save all the messages to the new chat
        for (const message of messagesToRegenerate) {
          await saveMessage(
            user,
            newChat.$id,
            message.role,
            message.content,
            message.model || null,
          )
        }

        // Update target for regeneration
        regenerationChatId = newChat.$id
        regenerationChat = newChat

        // Navigate to the new chat
        router.push(`/?chatId=${newChat.$id}`)
        setCurrentChatId(newChat.$id)
        setCurrentChat(newChat)

        // Set messages state to show the copied messages in the new chat
        setMessages(messagesToRegenerate)

        // Update chats list to include the new chat
        await loadChats()
      }

      // Make API call with the selected model
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userApiKey && { 'X-User-API-Key': userApiKey }),
        },
        body: JSON.stringify({
          messages: messagesToRegenerate.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          model: modelId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate response')
      }

      // Handle streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''

      // Create new message list by removing everything after messageIndex
      // and replacing the message at messageIndex with empty content for streaming
      let newMessages
      if (createNewChat) {
        // For new chat, start with the messages we copied and add the new one
        newMessages = [...messagesToRegenerate]
        newMessages.push({
          id: `regenerated-${Date.now()}`,
          role: 'assistant',
          content: '',
          model: modelId,
        })
      } else {
        // For same chat, replace the existing message
        newMessages = [...messages.slice(0, messageIndex + 1)]
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          id: `regenerated-${Date.now()}`,
          content: '',
          model: modelId,
        }
      }
      setMessages(newMessages)

      // Stream the regenerated response
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const content = JSON.parse(line.slice(2))
              if (content) {
                accumulatedContent += content

                // Update the regenerated message with new content
                setMessages((prev) => {
                  const updated = [...prev]
                  const targetIndex = createNewChat
                    ? prev.length - 1
                    : messageIndex
                  updated[targetIndex] = {
                    ...updated[targetIndex],
                    content: accumulatedContent,
                    model: modelId,
                  }
                  return updated
                })
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e)
            }
          }
        }
      }

      // Save the regenerated message to database
      // For new chats, we need to reference the newly created chat
      // For existing chats, use the current chat ID
      if (regenerationChatId && accumulatedContent) {
        const targetIndex = createNewChat
          ? newMessages.length - 1
          : messageIndex
        const messageId = newMessages[targetIndex].id
        setSavingMessages((prev) => new Set([...prev, messageId]))

        try {
          await saveMessage(
            user,
            regenerationChatId,
            'assistant',
            accumulatedContent,
            modelId,
          )
          setSavingMessages((prev) => {
            const newSet = new Set(prev)
            newSet.delete(messageId)
            return newSet
          })
        } catch (error) {
          console.error('Failed to save regenerated message:', error)
          setSavingMessages((prev) => {
            const newSet = new Set(prev)
            newSet.delete(messageId)
            return newSet
          })
        }
      }
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      alert('Failed to regenerate response. Please try again.')
    } finally {
      setRegeneratingMessageIndex(null)
    }
  }

  // Load user preferences when user logs in
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user) {
        try {
          const preferences = await getUserPreferences(account)
          setUserPreferences(preferences)

          // Update selected model if user has a saved preference
          if (preferences.lastUsedModel) {
            setSelectedModel(preferences.lastUsedModel)
          }
        } catch (error) {
          console.error('Failed to load user preferences:', error)
        }
      } else {
        // Clear preferences when user logs out
        setUserPreferences({})
      }
    }

    loadUserPreferences()
  }, [user])

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
                  onClick={() => setShowApiKeyModal(true)}
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
                  onClick={() => setShowApiKeyModal(true)}
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
                    onClick={() => setShowShareModal(true)}
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
                onClick={() => setShowApiKeyModal(true)}
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
                onClick={() => setShowApiKeyModal(true)}
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
                  onClick={() => setShowShareModal(true)}
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
          onRegenerate={handleRegenerate}
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
                  onApiKeyRequired={() => setShowApiKeyModal(true)}
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
                onApiKeyRequired={() => setShowApiKeyModal(true)}
              />
            </div>
          </form>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        chatId={currentChatId}
        chatTitle={currentChat?.title}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
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
        onClose={() => setShowDeleteConfirm(false)}
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
