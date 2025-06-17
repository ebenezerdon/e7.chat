'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PenLine, Menu, GitBranch, MoreHorizontal } from 'lucide-react'
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
  const [optionsModal, setOptionsModal] = useState({
    isOpen: false,
    chatId: null,
    chatTitle: '',
    position: { top: 0, left: 0 },
  })

  const openSidebar = () => setIsSidebarOpen(true)

  const closeSidebar = () => setIsSidebarOpen(false)

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
          <h2 className="sidebar-title">Chats</h2>
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

        <div className="chat-list">
          {fetchedChats?.map((chat) => (
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

          {fetchedChats?.length === 0 && (
            <p className="empty-chats">No chats yet</p>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="ai-status">
            <div className="ai-status-indicator">
              <div className="ai-status-dot"></div>
              <div className="ai-status-text">Ai Assistant</div>
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
