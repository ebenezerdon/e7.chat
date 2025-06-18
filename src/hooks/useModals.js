import { useState } from 'react'

export const useModals = () => {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const openAuthModal = () => setShowAuthModal(true)
  const closeAuthModal = () => setShowAuthModal(false)

  const openShareModal = () => setShowShareModal(true)
  const closeShareModal = () => setShowShareModal(false)

  const openApiKeyModal = () => setShowApiKeyModal(true)
  const closeApiKeyModal = () => setShowApiKeyModal(false)

  const openDeleteConfirm = () => setShowDeleteConfirm(true)
  const closeDeleteConfirm = () => setShowDeleteConfirm(false)

  return {
    // Modal states
    showAuthModal,
    showShareModal,
    showApiKeyModal,
    showDeleteConfirm,

    // Modal actions
    openAuthModal,
    closeAuthModal,
    openShareModal,
    closeShareModal,
    openApiKeyModal,
    closeApiKeyModal,
    openDeleteConfirm,
    closeDeleteConfirm,
  }
}
