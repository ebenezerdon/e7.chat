'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PenLine, Menu } from 'lucide-react'
import '../styles/sidebar.css'

export default function Sidebar({
  fetchedChats,
  currentChatId,
  setCurrentChatId,
  initializeNewChat,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const openSidebar = () => setIsSidebarOpen(true)

  const closeSidebar = () => setIsSidebarOpen(false)

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
            <Link
              key={chat.id}
              href={`/?chatId=${chat.id}`}
              onClick={() => {
                setCurrentChatId(chat.id)
                closeSidebar()
              }}
              className={`chat-item ${
                currentChatId === chat.id ? 'chat-item-active' : ''
              }`}
            >
              <span
                className={`chat-item-text ${
                  currentChatId === chat.id
                    ? 'chat-item-text-active'
                    : 'chat-item-text-inactive'
                }`}
              >
                {chat.title || 'New Chat'}
              </span>
            </Link>
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
    </>
  )
}
