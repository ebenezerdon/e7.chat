'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  PenLine,
  Menu,
  GitBranch,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react'
import ChatOptionsModal from './ChatOptionsModal'
import '../styles/sidebar.css'

export default function Sidebar({
  fetchedChats,
  currentChatId,
  setCurrentChatId,
  initializeNewChat,
  onRenameChat,
  onDeleteChat,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [optionsModal, setOptionsModal] = useState({
    isOpen: false,
    chatId: null,
    chatTitle: '',
    position: { top: 0, left: 0 },
  })

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return fetchedChats || []
    }

    const query = searchQuery.toLowerCase().trim()
    return (fetchedChats || []).filter((chat) => {
      const title = (chat.title || 'New Chat').toLowerCase()
      return title.includes(query)
    })
  }, [fetchedChats, searchQuery])

  const openSidebar = () => setIsSidebarOpen(true)

  const closeSidebar = () => setIsSidebarOpen(false)

  const clearSearch = () => setSearchQuery('')

  const handleOptionsClick = (e, chat) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = e.target
      .closest('.chat-options-button')
      .getBoundingClientRect()
    const modalPosition = {
      top: rect.bottom + 5,
      left: rect.left - 120, // Position modal to the left of the button
    }

    setOptionsModal({
      isOpen: true,
      chatId: chat.$id,
      chatTitle: chat.title || 'New Chat',
      position: modalPosition,
    })
  }

  const closeOptionsModal = () => {
    setOptionsModal({
      isOpen: false,
      chatId: null,
      chatTitle: '',
      position: { top: 0, left: 0 },
    })
  }

  const handleRename = async (newTitle) => {
    if (onRenameChat && optionsModal.chatId) {
      await onRenameChat(optionsModal.chatId, newTitle)
    }
  }

  const handleDelete = async () => {
    if (onDeleteChat && optionsModal.chatId) {
      await onDeleteChat(optionsModal.chatId)
    }
  }

  return (
    <>
      <button
        onClick={openSidebar}
        className="mobile-menu-button"
        aria-label="Open menu"
      >
        <Menu className="mobile-menu-icon" strokeWidth={1.5} />
      </button>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">e7.chat</h2>
          <button
            onClick={() => {
              initializeNewChat()
              closeSidebar()
            }}
            className="new-chat-button"
            aria-label="New chat"
          >
            <PenLine className="new-chat-icon" strokeWidth={2} />
          </button>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={16} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="clear-search-button"
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="search-results-count">
              {filteredChats.length} result
              {filteredChats.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="chat-list">
          {filteredChats?.map((chat) => (
            <div key={chat.$id} className="chat-item-wrapper">
              <Link
                href={`/?chatId=${chat.$id}`}
                onClick={() => {
                  setCurrentChatId(chat.$id)
                  closeSidebar()
                }}
                className={`chat-item ${
                  currentChatId === chat.$id ? 'chat-item-active' : ''
                } ${chat.isOptimistic ? 'chat-item-creating' : ''}`}
              >
                <div className="chat-item-content">
                  {chat.isBranch && (
                    <GitBranch
                      className="branch-icon"
                      size={14}
                      strokeWidth={1.5}
                    />
                  )}
                  <span
                    className={`chat-item-text ${
                      currentChatId === chat.$id
                        ? 'chat-item-text-active'
                        : 'chat-item-text-inactive'
                    }`}
                  >
                    {chat.title || 'New Chat'}
                    {chat.isOptimistic && (
                      <span className="chat-creating-indicator"> ●</span>
                    )}
                  </span>
                </div>
              </Link>
              {!chat.isOptimistic && (
                <button
                  className="chat-options-button"
                  onClick={(e) => handleOptionsClick(e, chat)}
                  aria-label="Chat options"
                >
                  <MoreHorizontal className="options-dots" />
                </button>
              )}
            </div>
          ))}

          {filteredChats?.length === 0 && searchQuery && (
            <div className="empty-search-results">
              <p className="empty-search-text">
                No chats found for "{searchQuery}"
              </p>
              <button onClick={clearSearch} className="clear-search-action">
                Clear search
              </button>
            </div>
          )}

          {filteredChats?.length === 0 && !searchQuery && (
            <p className="empty-chats">No chats yet</p>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="ai-status">
            <div className="ai-status-indicator">
              <div className="ai-status-dot"></div>
              <div className="ai-status-text">e7.chat</div>
            </div>
            <div className="ai-status-subtext">Here to help, 24/7</div>
          </div>
        </div>
      </div>

      <ChatOptionsModal
        isOpen={optionsModal.isOpen}
        onClose={closeOptionsModal}
        onRename={handleRename}
        onDelete={handleDelete}
        chatTitle={optionsModal.chatTitle}
        position={optionsModal.position}
      />
    </>
  )
}
