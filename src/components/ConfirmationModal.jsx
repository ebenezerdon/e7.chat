'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' or 'warning'
}) {
  const modalRef = useRef(null)

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="confirmation-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="confirmation-modal"
        role="dialog"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
      >
        <div className="confirmation-header">
          <div className={`confirmation-icon ${variant}`}>
            <AlertTriangle size={20} />
          </div>
          <h3 id="confirmation-title" className="confirmation-title">
            {title}
          </h3>
        </div>

        <div className="confirmation-body">
          <p id="confirmation-message" className="confirmation-message">
            {message}
          </p>
        </div>

        <div className="confirmation-actions">
          <button
            onClick={onClose}
            className="confirmation-button cancel"
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`confirmation-button confirm ${variant}`}
            type="button"
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
