'use client'

import { useState, useRef, useEffect } from 'react'
import { Edit3, Trash2 } from 'lucide-react'
import ConfirmationModal from './ConfirmationModal'

export default function ChatOptionsModal({
  isOpen,
  onClose,
  onRename,
  onDelete,
  chatTitle,
  position,
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newTitle, setNewTitle] = useState(chatTitle || '')
  const modalRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && isRenaming) {
      // Focus input when entering rename mode
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, isRenaming])

  useEffect(() => {
    // Update newTitle state when chatTitle prop changes
    setNewTitle(chatTitle || '')
  }, [chatTitle])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose()
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsRenaming(false)
    setShowDeleteConfirm(false)
    setNewTitle(chatTitle || '')
    onClose()
  }

  const handleRenameClick = () => {
    setIsRenaming(true)
  }

  const handleRenameSubmit = (e) => {
    e.preventDefault()
    if (newTitle.trim() && newTitle.trim() !== chatTitle) {
      onRename(newTitle.trim())
    }
    handleClose()
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    onDelete()
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      className="chat-options-modal"
      style={{
        position: 'absolute',
        top: position?.top || 0,
        left: position?.left || 0,
        zIndex: 1000,
      }}
    >
      {isRenaming ? (
        <form onSubmit={handleRenameSubmit} className="rename-form">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rename-input"
            placeholder="Enter chat title..."
            maxLength={100}
          />
          <div className="rename-actions">
            <button type="submit" className="rename-save">
              Save
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rename-cancel"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="options-menu">
          <button onClick={handleRenameClick} className="option-item">
            <Edit3 size={14} />
            <span>Rename</span>
          </button>
          <button onClick={handleDeleteClick} className="option-item delete">
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}

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
