import { useState, useEffect, useRef } from 'react'
import {
  Key,
  X,
  ExternalLink,
  Info,
  CheckCircle,
  AlertCircle,
  Image,
  MessageSquare,
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

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    icon: MessageSquare,
    placeholder: 'sk-or-...',
    keyPrefix: 'sk-or-',
    dashboardUrl: 'https://openrouter.ai/keys',
    description: 'Access 400+ AI models with your own OpenRouter API key',
    testUrl: 'https://openrouter.ai/api/v1/auth/key',
    localStorageKey: 'userOpenRouterApiKey',
    benefits: [
      '- Access to 400+ AI models',
      '- Direct control over costs and usage',
      '- Higher rate limits',
      '- Better performance',
    ],
  },
  openai: {
    name: 'OpenAI',
    icon: Image,
    placeholder: 'sk-...',
    keyPrefix: 'sk-',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    description: 'Use your OpenAI API key for DALL-E image generation',
    testUrl: 'https://api.openai.com/v1/models',
    localStorageKey: 'userOpenAiApiKey',
    benefits: [
      '- Direct access to DALL-E models',
      '- No rate limits from our server',
      '- Full control over usage',
      '- Better image generation speed',
    ],
  },
}

const ApiKeyModal = ({ isOpen, onClose, onSave, user }) => {
  const [activeTab, setActiveTab] = useState('openrouter')
  const [keys, setKeys] = useState({
    openrouter: '',
    openai: '',
  })
  const [loading, setLoading] = useState({
    openrouter: false,
    openai: false,
  })
  const [errors, setErrors] = useState({
    openrouter: '',
    openai: '',
  })
  const [success, setSuccess] = useState({
    openrouter: false,
    openai: false,
  })
  const [syncToCloud, setSyncToCloud] = useState({
    openrouter: false,
    openai: false,
  })
  const [loadingCloudKeys, setLoadingCloudKeys] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadApiKeys()
      setErrors({ openrouter: '', openai: '' })
      setSuccess({ openrouter: false, openai: false })
    }
  }, [isOpen, user])

  const loadApiKeys = async () => {
    setLoadingCloudKeys(true)
    const newKeys = { openrouter: '', openai: '' }
    const newSyncStates = { openrouter: false, openai: false }

    try {
      for (const provider of Object.keys(PROVIDERS)) {
        if (!user) {
          // Guest mode - only check localStorage
          const savedKey = localStorage.getItem(
            PROVIDERS[provider].localStorageKey,
          )
          if (savedKey) {
            newKeys[provider] = savedKey
            newSyncStates[provider] = false
          }
        } else {
          // User is logged in - check cloud first, then local
          try {
            const documents = await databases.listDocuments(
              DATABASE_ID,
              API_KEYS_COLLECTION_ID,
              [
                Query.equal('userId', user.$id),
                Query.equal('provider', provider),
              ],
            )

            if (documents.total > 0) {
              // Cloud sync is enabled - use cloud as source of truth
              const keyDoc = documents.documents[0]
              const decryptedKey = decrypt(keyDoc.encryptedKey, user.$id)
              newKeys[provider] = decryptedKey
              newSyncStates[provider] = true
            } else {
              // No cloud key - check localStorage for local-only key
              const localKey = localStorage.getItem(
                PROVIDERS[provider].localStorageKey,
              )
              if (localKey) {
                newKeys[provider] = localKey
                newSyncStates[provider] = false
              }
            }
          } catch (error) {
            console.error(`Error loading ${provider} API key:`, error)
            // On error, fallback to localStorage
            const localKey = localStorage.getItem(
              PROVIDERS[provider].localStorageKey,
            )
            if (localKey) {
              newKeys[provider] = localKey
              newSyncStates[provider] = false
            }
          }
        }
      }
    } finally {
      setKeys(newKeys)
      setSyncToCloud(newSyncStates)
      setLoadingCloudKeys(false)
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

  const validateApiKey = (key, provider) => {
    const config = PROVIDERS[provider]
    return (
      key.startsWith(config.keyPrefix) &&
      key.length > (provider === 'openai' ? 40 : 20)
    )
  }

  const testApiKey = async (key, provider) => {
    try {
      const config = PROVIDERS[provider]
      const response = await fetch(config.testUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key')
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded')
        } else {
          throw new Error('API key validation failed')
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const handleSave = async (provider) => {
    const key = keys[provider]
    const config = PROVIDERS[provider]

    if (!key.trim()) {
      setErrors((prev) => ({
        ...prev,
        [provider]: `Please enter your ${config.name} API key`,
      }))
      return
    }

    if (!validateApiKey(key.trim(), provider)) {
      setErrors((prev) => ({
        ...prev,
        [provider]: `Invalid API key format. ${config.name} keys start with "${config.keyPrefix}"`,
      }))
      return
    }

    setLoading((prev) => ({ ...prev, [provider]: true }))
    setErrors((prev) => ({ ...prev, [provider]: '' }))

    try {
      // Test the API key
      const result = await testApiKey(key.trim(), provider)

      if (!result.success) {
        throw new Error(result.error)
      }

      // If user wants cloud sync and is authenticated, save to cloud
      if (syncToCloud[provider] && user) {
        // Cloud sync enabled - save to cloud only
        try {
          const encryptedKey = encrypt(key.trim(), user.$id)

          // Check if user already has an API key for this provider
          const existingDocs = await databases.listDocuments(
            DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            [
              Query.equal('userId', user.$id),
              Query.equal('provider', provider),
            ],
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
                provider,
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
          setErrors((prev) => ({
            ...prev,
            [provider]: `Cloud sync failed: ${cloudError.message}`,
          }))
          return // Don't proceed if cloud sync fails
        }
      } else {
        // Cloud sync disabled - save to localStorage only
        localStorage.setItem(config.localStorageKey, key.trim())
      }

      if (user && !syncToCloud[provider]) {
        // User disabled cloud sync - remove from cloud if it exists
        try {
          const documents = await databases.listDocuments(
            DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            [
              Query.equal('userId', user.$id),
              Query.equal('provider', provider),
            ],
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
      onSave(provider, key.trim(), result.data, syncToCloud[provider])

      setSuccess((prev) => ({ ...prev, [provider]: true }))
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, [provider]: false }))
      }, 3000)
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [provider]: error.message || 'Failed to validate API key',
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const handleRemove = async (provider) => {
    const config = PROVIDERS[provider]

    setLoading((prev) => ({ ...prev, [provider]: true }))
    try {
      if (syncToCloud[provider] && user) {
        // Cloud sync enabled - remove from cloud
        try {
          const documents = await databases.listDocuments(
            DATABASE_ID,
            API_KEYS_COLLECTION_ID,
            [
              Query.equal('userId', user.$id),
              Query.equal('provider', provider),
            ],
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
          setErrors((prev) => ({
            ...prev,
            [provider]: 'Failed to remove API key from cloud',
          }))
          return
        }
      } else {
        // Local only - remove from localStorage
        localStorage.removeItem(config.localStorageKey)
      }

      setKeys((prev) => ({ ...prev, [provider]: '' }))
      setSyncToCloud((prev) => ({ ...prev, [provider]: false }))
      onSave(provider, null, null, false)
      setSuccess((prev) => ({ ...prev, [provider]: true }))
      setTimeout(() => {
        setSuccess((prev) => ({ ...prev, [provider]: false }))
      }, 2000)
    } finally {
      setLoading((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const handleKeyChange = (provider, value) => {
    setKeys((prev) => ({ ...prev, [provider]: value }))
  }

  const handleSyncToggle = (provider, enabled) => {
    setSyncToCloud((prev) => ({ ...prev, [provider]: enabled }))
  }

  if (!isOpen) return null

  const activeProvider = PROVIDERS[activeTab]
  const IconComponent = activeProvider.icon

  return (
    <div
      className="share-modal-overlay share-modal-overlay-animate"
      onClick={handleOverlayClick}
    >
      <div
        className="share-modal share-modal-animate"
        ref={modalRef}
        style={{
          maxWidth: '650px',
          background: 'linear-gradient(135deg, #2c313a 0%, #2e333d 100%)',
          border: '1px solid #3a404b',
          color: '#f3f4f6',
        }}
      >
        <div className="share-modal-header">
          <div className="share-modal-title">
            <Key size={20} />
            <h2>API Key Management</h2>
          </div>
          <button onClick={onClose} className="share-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="share-modal-content">
          {/* Tab Navigation */}
          <div className="api-key-tabs">
            {Object.entries(PROVIDERS).map(([key, config]) => {
              const TabIcon = config.icon
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`api-key-tab ${activeTab === key ? 'active' : ''}`}
                >
                  <TabIcon size={16} />
                  {config.name}
                  {keys[key] && <div className="key-indicator" />}
                </button>
              )
            })}
          </div>

          {loadingCloudKeys && (
            <div className="loading-section">
              <div className="spinner" />
              Loading your API keys...
            </div>
          )}

          {/* Tab Content */}
          <div className="api-key-tab-content">
            <div className="api-key-info">
              <div className="info-section">
                <Info
                  size={16}
                  style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <h4>
                    <IconComponent size={16} style={{ marginRight: '6px' }} />
                    {activeProvider.name} API Key
                  </h4>
                  <p>{activeProvider.description}</p>
                  <ul>
                    {activeProvider.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="get-key-section">
                <p>Don't have a {activeProvider.name} API key?</p>
                <a
                  href={activeProvider.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="get-key-link"
                >
                  Get your API key <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="api-key-input-section">
              <label>API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={keys[activeTab]}
                  onChange={(e) => handleKeyChange(activeTab, e.target.value)}
                  placeholder={activeProvider.placeholder}
                  className="api-key-input"
                />
              </div>
              <p className="input-helper">
                {syncToCloud[activeTab]
                  ? 'API key will be synced across your devices'
                  : 'API key is stored locally on this device only'}
              </p>
            </div>

            {user && (
              <div className="sync-toggle-section">
                <label className="sync-toggle-label">
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={syncToCloud[activeTab]}
                      onChange={(e) =>
                        handleSyncToggle(activeTab, e.target.checked)
                      }
                    />
                    <div
                      className={`toggle-slider ${
                        syncToCloud[activeTab] ? 'active' : ''
                      }`}
                    >
                      <div className="toggle-knob" />
                    </div>
                  </div>
                  <div>
                    <div className="toggle-title">Sync to cloud</div>
                    <div className="toggle-description">
                      Access your API key on all your devices
                    </div>
                  </div>
                </label>
              </div>
            )}

            {errors[activeTab] && (
              <div className="error-message">
                <AlertCircle size={16} />
                {errors[activeTab]}
              </div>
            )}

            {success[activeTab] && (
              <div className="success-message">
                <CheckCircle size={16} />
                {keys[activeTab]
                  ? 'API key saved successfully!'
                  : 'API key removed successfully!'}
              </div>
            )}

            <div className="button-group">
              {keys[activeTab] && (
                <button
                  onClick={() => handleRemove(activeTab)}
                  disabled={loading[activeTab]}
                  className="remove-button"
                >
                  Remove Key
                </button>
              )}
              <button
                onClick={() => handleSave(activeTab)}
                disabled={loading[activeTab] || !keys[activeTab].trim()}
                className="save-button"
              >
                {loading[activeTab] ? 'Validating...' : 'Save API Key'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add custom styles for this modal
const styles = `
  .api-key-tabs {
    display: flex;
    border-bottom: 1px solid #3a404b;
    margin-bottom: 24px;
    gap: 4px;
  }

  .api-key-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 8px 8px 0 0;
    position: relative;
  }

  .api-key-tab:hover {
    color: #f3f4f6;
    background: rgba(75, 85, 99, 0.1);
  }

  .api-key-tab.active {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
    border-bottom: 2px solid #60a5fa;
  }

  .key-indicator {
    width: 6px;
    height: 6px;
    background: #22c55e;
    border-radius: 50%;
    margin-left: 4px;
  }

  .api-key-tab-content {
    animation: fadeIn 0.2s ease-in-out;
  }

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

  .info-section h4 {
    margin: 0 0 4px 0;
    fontSize: 14px;
    font-weight: 600;
    color: #f3f4f6;
    display: flex;
    align-items: center;
  }

  .info-section p {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #9ca3af;
    line-height: 1.4;
  }

  .info-section ul {
    margin: 0;
    font-size: 13px;
    color: #9ca3af;
    line-height: 1.4;
    padding-left: 0;
    list-style: none;
  }

  .get-key-section {
    padding-top: 12px;
    border-top: 1px solid rgba(59, 130, 246, 0.1);
  }

  .get-key-section p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #d1d5db;
  }

  .get-key-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #60a5fa;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
  }

  .api-key-input-section {
    margin-bottom: 16px;
  }

  .api-key-input-section label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #f3f4f6;
  }

  .api-key-input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #3a404b;
    background-color: #1f2937;
    color: #f3f4f6;
    font-size: 14px;
    font-family: monospace;
    outline: none;
    transition: border-color 0.2s;
  }

  .api-key-input:focus {
    border-color: #60a5fa;
  }

  .input-helper {
    margin: 6px 0 0 0;
    font-size: 12px;
    color: #9ca3af;
  }

  .sync-toggle-section {
    margin-bottom: 16px;
    padding: 16px;
    background: rgba(75, 85, 99, 0.1);
    border: 1px solid rgba(75, 85, 99, 0.2);
    border-radius: 8px;
  }

  .sync-toggle-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-size: 14px;
    color: #f3f4f6;
  }

  .toggle-switch {
    position: relative;
  }

  .toggle-switch input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }

  .toggle-slider {
    width: 44px;
    height: 24px;
    background-color: #374151;
    border-radius: 12px;
    position: relative;
    transition: background-color 0.2s;
    border: 1px solid #4b5563;
  }

  .toggle-slider.active {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .toggle-knob {
    width: 18px;
    height: 18px;
    background-color: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .toggle-slider.active .toggle-knob {
    left: 22px;
  }

  .toggle-title {
    font-weight: 500;
  }

  .toggle-description {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 2px;
  }

  .loading-section {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
    color: #60a5fa;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #60a5fa;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #ef4444;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 8px;
    color: #22c55e;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .remove-button {
    flex: 0 0 auto;
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid #ef4444;
    background-color: transparent;
    color: #ef4444;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .remove-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }

  .save-button {
    flex: 1;
    padding: 12px 20px;
    border-radius: 8px;
    border: none;
    background-color: #3b82f6;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .save-button:not(:disabled):hover {
    background-color: #2563eb;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

export default ApiKeyModal
