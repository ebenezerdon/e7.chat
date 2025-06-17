import { useState, useEffect, useRef } from 'react'
import {
  Key,
  X,
  ExternalLink,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { databases, ID } from '../lib/appwrite'
import { Query } from 'appwrite'
import '../styles/auth.css'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ai-chat-db'
const API_KEYS_COLLECTION_ID = 'api_keys'

// Simple encryption/decryption using built-in crypto
const encrypt = (text, key) => {
  const keyBuffer = Buffer.from(key, 'utf8')
  const textBuffer = Buffer.from(text, 'utf8')
  const encrypted = Buffer.alloc(textBuffer.length)

  for (let i = 0; i < textBuffer.length; i++) {
    encrypted[i] = textBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return encrypted.toString('base64')
}

const decrypt = (encryptedText, key) => {
  try {
    const keyBuffer = Buffer.from(key, 'utf8')
    const encryptedBuffer = Buffer.from(encryptedText, 'base64')
    const decrypted = Buffer.alloc(encryptedBuffer.length)

    for (let i = 0; i < encryptedBuffer.length; i++) {
      decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length]
    }

    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error('Failed to decrypt API key')
  }
}

const ApiKeyModal = ({ isOpen, onClose, onSave, user }) => {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [syncToCloud, setSyncToCloud] = useState(false)
  const [loadingCloudKey, setLoadingCloudKey] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadApiKey()
      setIsAnimating(true)
      setError('')
      setSuccess(false)
    } else {
      setIsAnimating(false)
    }
  }, [isOpen, user])

  const loadApiKey = async () => {
    if (!user) {
      // Guest mode - only check localStorage
      const savedKey = localStorage.getItem('userOpenRouterApiKey')
      if (savedKey) {
        setApiKey(savedKey)
        setSyncToCloud(false)
      }
      return
    }

    setLoadingCloudKey(true)
    try {
      // Check cloud storage first using direct database call
      const documents = await databases.listDocuments(
        DATABASE_ID,
        API_KEYS_COLLECTION_ID,
        [Query.equal('userId', user.$id)],
      )

      if (documents.total > 0) {
        // Cloud sync is enabled - use cloud as source of truth
        const keyDoc = documents.documents[0]
        const decryptedKey = decrypt(keyDoc.encryptedKey, user.$id)
        setApiKey(decryptedKey)
        setSyncToCloud(true)
        return
      }

      // No cloud key - check localStorage for local-only key
      const localKey = localStorage.getItem('userOpenRouterApiKey')
      if (localKey) {
        setApiKey(localKey)
        setSyncToCloud(false)
      } else {
        // No key anywhere
        setApiKey('')
        setSyncToCloud(false)
      }
    } catch (error) {
      console.error('Error loading API key:', error)
      // On error, fallback to localStorage
      const localKey = localStorage.getItem('userOpenRouterApiKey')
      if (localKey) {
        setApiKey(localKey)
        setSyncToCloud(false)
      } else {
        setApiKey('')
        setSyncToCloud(false)
      }
    } finally {
      setLoadingCloudKey(false)
    }
  }

  // Handle ESC key press and prevent body scroll
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [isOpen, onClose])

  const handleOverlayClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose()
    }
  }

  const validateApiKey = (key) => {
    // OpenRouter API keys start with 'sk-or-'
    return key.startsWith('sk-or-') && key.length > 20
  }

  const testApiKey = async (key) => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      })

      if (!response.ok) {
        throw new Error('Invalid API key or network error')
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenRouter API key')
      return
    }

    if (!validateApiKey(apiKey.trim())) {
      setError('Invalid API key format. OpenRouter keys start with "sk-or-"')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Test the API key
      const result = await testApiKey(apiKey.trim())

      if (!result.success) {
        throw new Error(result.error)
      }

      // If user wants cloud sync and is authenticated, save to cloud
      if (syncToCloud && user) {
        // Cloud sync enabled - save to cloud only
        try {
          const encryptedKey = encrypt(apiKey.trim(), user.$id)

          // Check if user already has an API key
          const existingDocs = await databases.listDocuments(
            DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            [Query.equal('userId', user.$id)],
          )

          const now = new Date().toISOString()

          if (existingDocs.total > 0) {
            // Update existing document
            await databases.updateDocument(
              DATABASE_ID,
              API_KEYS_COLLECTION_ID,
              existingDocs.documents[0].$id,
              {
                encryptedKey,
                updatedAt: now,
                isActive: true,
              },
            )
          } else {
            // Create new document
            await databases.createDocument(
              DATABASE_ID,
              API_KEYS_COLLECTION_ID,
              ID.unique(),
              {
                userId: user.$id,
                encryptedKey,
                createdAt: now,
                updatedAt: now,
                isActive: true,
              },
              [
                `read("user:${user.$id}")`,
                `update("user:${user.$id}")`,
                `delete("user:${user.$id}")`,
              ],
            )
          }
        } catch (cloudError) {
          console.error('Cloud sync failed:', cloudError)
          setError(`Cloud sync failed: ${cloudError.message}`)
          return // Don't proceed if cloud sync fails
        }
      } else {
        // Cloud sync disabled - save to localStorage only
        localStorage.setItem('userOpenRouterApiKey', apiKey.trim())
      }

      if (user && !syncToCloud) {
        // User disabled cloud sync - remove from cloud if it exists
        try {
          const documents = await databases.listDocuments(
            DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            [Query.equal('userId', user.$id)],
          )

          if (documents.total > 0) {
            await databases.deleteDocument(
              DATABASE_ID,
              API_KEYS_COLLECTION_ID,
              documents.documents[0].$id,
            )
          }
        } catch (error) {
          console.error('Failed to remove from cloud:', error)
          // Don't show error for this
        }
      }

      // Call the onSave callback
      onSave(apiKey.trim(), result.data, syncToCloud)

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (error) {
      setError(error.message || 'Failed to validate API key')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      if (syncToCloud && user) {
        // Cloud sync enabled - remove from cloud
        try {
          const documents = await databases.listDocuments(
            DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            [Query.equal('userId', user.$id)],
          )

          if (documents.total > 0) {
            await databases.deleteDocument(
              DATABASE_ID,
              API_KEYS_COLLECTION_ID,
              documents.documents[0].$id,
            )
          }
        } catch (error) {
          console.error('Failed to remove from cloud:', error)
          setError('Failed to remove API key from cloud')
          return
        }
      } else {
        // Local only - remove from localStorage
        localStorage.removeItem('userOpenRouterApiKey')
      }

      setApiKey('')
      setSyncToCloud(false)
      onSave(null, null, false)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1000)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`share-modal-overlay ${
        isAnimating ? 'share-modal-overlay-animate' : ''
      }`}
      onClick={handleOverlayClick}
    >
      <div
        className={`share-modal ${isAnimating ? 'share-modal-animate' : ''}`}
        ref={modalRef}
        style={{
          maxWidth: '560px',
          background: 'linear-gradient(135deg, #2c313a 0%, #2e333d 100%)',
          border: '1px solid #3a404b',
          color: '#f3f4f6',
        }}
      >
        <div className="share-modal-header">
          <div className="share-modal-title">
            <Key size={20} />
            <h2>OpenRouter API Key</h2>
          </div>
          <button onClick={onClose} className="share-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="share-modal-content">
          <div className="api-key-info">
            <div className="info-section">
              <Info
                size={16}
                style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }}
              />
              <div>
                <h4
                  style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#f3f4f6',
                  }}
                >
                  Why use your own API key?
                </h4>
                <ul
                  style={{
                    margin: '0',
                    fontSize: '13px',
                    color: '#9ca3af',
                    lineHeight: '1.4',
                  }}
                >
                  <li>- Direct control over costs and usage</li>
                  <li>- Access to more models</li>
                  <li>- Higher rate limits</li>
                  <li>- Better performance and reliability</li>
                </ul>
              </div>
            </div>

            <div className="get-key-section">
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  color: '#d1d5db',
                }}
              >
                Don't have an OpenRouter API key?
              </p>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#60a5fa',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Get your API key <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div className="api-key-input-section">
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#f3f4f6',
              }}
            >
              API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #3a404b',
                  backgroundColor: '#1f2937',
                  color: '#f3f4f6',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#60a5fa')}
                onBlur={(e) => (e.target.style.borderColor = '#3a404b')}
              />
            </div>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              {syncToCloud
                ? 'API key will be synced across your devices'
                : 'API key is stored locally on this device only'}
            </p>
          </div>

          {user && (
            <div className="sync-toggle-section">
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#f3f4f6',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={syncToCloud}
                    onChange={(e) => setSyncToCloud(e.target.checked)}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      backgroundColor: syncToCloud ? '#3b82f6' : '#374151',
                      borderRadius: '12px',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                      border: `1px solid ${
                        syncToCloud ? '#3b82f6' : '#4b5563'
                      }`,
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: syncToCloud ? '22px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: '500' }}>Sync to cloud</div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginTop: '2px',
                    }}
                  >
                    Access your API key on all your devices
                  </div>
                </div>
              </label>
            </div>
          )}

          {loadingCloudKey && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                color: '#60a5fa',
                fontSize: '14px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #60a5fa',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Loading your API key...
            </div>
          )}

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
                color: '#22c55e',
                fontSize: '14px',
              }}
            >
              <CheckCircle size={16} />
              {apiKey
                ? 'API key saved successfully!'
                : 'API key removed successfully!'}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            {apiKey && (
              <button
                onClick={handleRemove}
                style={{
                  flex: '0 0 auto',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = 'transparent')
                }
              >
                Remove Key
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={loading || !apiKey.trim()}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || !apiKey.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !apiKey.trim() ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Validating...' : 'Save API Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add custom styles for this modal
const styles = `
  .api-key-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.1);
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .info-section {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .get-key-section {
    padding-top: 12px;
    border-top: 1px solid rgba(59, 130, 246, 0.1);
  }

  .api-key-input-section {
    margin-bottom: 16px;
  }

  .sync-toggle-section {
    margin-bottom: 16px;
    padding: 16px;
    background: rgba(75, 85, 99, 0.1);
    border: 1px solid rgba(75, 85, 99, 0.2);
    border-radius: 8px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

export default ApiKeyModal
