import { useState, useEffect } from 'react'
import { Copy, Check, X, Share2, ExternalLink } from 'lucide-react'
import { shareChat, unshareChat, getChatShareStatus } from '../lib/db'
import { useAuth } from '../lib/auth'

const ShareModal = ({ isOpen, onClose, chatId, chatTitle }) => {
  const { user } = useAuth()
  const [shareStatus, setShareStatus] = useState({ isShared: false })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && chatId && user) {
      checkShareStatus()
    }
  }, [isOpen, chatId, user])

  const checkShareStatus = async () => {
    try {
      setLoading(true)
      const status = await getChatShareStatus(user, chatId)
      setShareStatus(status)
    } catch (error) {
      console.error('Error checking share status:', error)
      setError('Failed to check share status')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      setLoading(true)
      setError('')
      const result = await shareChat(user, chatId)
      setShareStatus({
        isShared: true,
        shareId: result.shareId,
        shareUrl: result.shareUrl,
        sharedAt: result.sharedAt,
      })
    } catch (error) {
      console.error('Error sharing chat:', error)
      setError('Failed to share chat. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnshare = async () => {
    try {
      setLoading(true)
      setError('')
      await unshareChat(user, chatId)
      setShareStatus({ isShared: false })
    } catch (error) {
      console.error('Error unsharing chat:', error)
      setError('Failed to stop sharing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareStatus.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareStatus.shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="share-modal-overlay">
      <div className="share-modal">
        <div className="share-modal-header">
          <div className="share-modal-title">
            <Share2 size={20} />
            <h2>Share Chat</h2>
          </div>
          <button onClick={onClose} className="share-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="share-modal-content">
          <div className="share-chat-info">
            <h3>"{chatTitle || 'Untitled Chat'}"</h3>
            <p>
              Share this conversation with others. Anyone with the link will be
              able to view it.
            </p>
          </div>

          {error && <div className="share-error">{error}</div>}

          {loading ? (
            <div className="share-loading">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>Loading...</span>
            </div>
          ) : shareStatus.isShared ? (
            <div className="share-active">
              <div className="share-url-container">
                <div className="share-url">
                  <ExternalLink size={16} />
                  <span>{shareStatus.shareUrl}</span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="copy-button"
                  disabled={copied}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="share-info">
                <p>✅ This chat is publicly shared</p>
                <p className="share-date">
                  Shared on{' '}
                  {new Date(shareStatus.sharedAt).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={handleUnshare}
                className="unshare-button"
                disabled={loading}
              >
                Stop Sharing
              </button>
            </div>
          ) : (
            <div className="share-inactive">
              <div className="share-preview">
                <div className="share-preview-icon">
                  <Share2 size={24} />
                </div>
                <p>Make this conversation public and shareable</p>
              </div>

              <button
                onClick={handleShare}
                className="share-button"
                disabled={loading}
              >
                <Share2 size={16} />
                Create Share Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareModal
