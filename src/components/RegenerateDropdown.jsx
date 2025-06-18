import {
  Loader2,
  RotateCcw,
  ChevronDown,
  Star,
  ExternalLink,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const RegenerateDropdown = ({
  onRegenerate,
  messageIndex,
  isRegenerating,
  hasApiKey = false,
  onApiKeyRequired,
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [availableModels, setAvailableModels] = useState({})
  const [loadingModels, setLoadingModels] = useState(true)
  const [createNewChat, setCreateNewChat] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState('up')
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 })
  const regenerateRef = useRef(null)

  // Load available models when component mounts
  useEffect(() => {
    fetchAvailableModels()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside the regenerate button
      if (
        regenerateRef.current &&
        regenerateRef.current.contains(event.target)
      ) {
        return
      }

      // Check if click is inside the dropdown portal
      const dropdownPortal = document.querySelector(
        '.regenerate-dropdown-portal',
      )
      if (dropdownPortal && dropdownPortal.contains(event.target)) {
        return
      }

      // If click is outside both button and dropdown, close it
      setShowDropdown(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDropdown])

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/chat')
      if (response.ok) {
        const data = await response.json()
        setAvailableModels(data.providers || {})
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoadingModels(false)
    }
  }

  const calculateDropdownPosition = () => {
    if (!regenerateRef.current)
      return { position: 'up', coords: { top: 0, left: 0 } }

    const button = regenerateRef.current.querySelector('.regenerate-button')
    if (!button) return { position: 'up', coords: { top: 0, left: 0 } }

    const rect = button.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 400 // Approximate max height of dropdown
    const margin = 20 // Safety margin

    // Calculate available space above and below
    const spaceAbove = rect.top
    const spaceBelow = viewportHeight - rect.bottom

    let position = 'up'
    let top = rect.top - dropdownHeight - 8 // Position above button

    // If there's not enough space above, show below
    if (
      spaceAbove < dropdownHeight + margin &&
      spaceBelow > dropdownHeight + margin
    ) {
      position = 'down'
      top = rect.bottom + 8 // Position below button
    }

    const coords = {
      top: Math.max(8, top), // Ensure it doesn't go off-screen
      left: rect.left,
    }

    return { position, coords }
  }

  const handleRegenerateWithModel = (modelId) => {
    // Allow gpt-4o-mini without API key, require API key for all other models
    if (!hasApiKey && modelId !== 'openai/gpt-4o-mini') {
      setShowDropdown(false) // Close dropdown before opening API key modal
      if (onApiKeyRequired) {
        onApiKeyRequired()
      }
      return
    }

    if (onRegenerate && messageIndex !== undefined) {
      onRegenerate(messageIndex, modelId, createNewChat)
      setShowDropdown(false)
      setCreateNewChat(false) // Reset toggle after use
    }
  }

  const getFeaturedModels = () => {
    const featured = []
    const featuredIds = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5',
      'deepseek/deepseek-chat',
    ]

    for (const [providerId, provider] of Object.entries(availableModels)) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        if (featuredIds.includes(modelId)) {
          featured.push({
            id: modelId,
            name: model.name,
            description: model.description,
            pricing: model.pricing,
            provider: provider.name,
            featured: model.featured,
          })
        }
      }
    }
    return featured
  }

  const handleButtonClick = () => {
    const newShowState = !showDropdown
    if (newShowState) {
      // Calculate position and coordinates
      const { position, coords } = calculateDropdownPosition()
      setDropdownPosition(position)
      setDropdownCoords(coords)
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  return (
    <div className="message-actions">
      <div className="regenerate-container" ref={regenerateRef}>
        <button
          onClick={handleButtonClick}
          className={`regenerate-button ${
            isRegenerating ? 'regenerating' : ''
          }`}
          disabled={isRegenerating}
          title="Regenerate response with different model"
        >
          <div className="regenerate-button-content">
            {isRegenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            <span>Regenerate</span>
            <ChevronDown
              size={12}
              className={`chevron ${showDropdown ? 'rotate' : ''}`}
            />
          </div>
        </button>

        {showDropdown &&
          !loadingModels &&
          createPortal(
            <div
              className="regenerate-dropdown-portal"
              style={{
                position: 'fixed',
                top: dropdownCoords.top,
                left: dropdownCoords.left,
                zIndex: 99999,
                background: 'linear-gradient(to bottom, #2c313a, #252a32)',
                border: '1px solid rgba(58, 64, 75, 0.7)',
                borderRadius: '8px',
                minWidth: '320px',
                maxWidth: '384px',
                maxHeight: '384px',
                overflowY: 'auto',
                boxShadow:
                  '0 10px 25px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="regenerate-dropdown-header">
                <span>Choose model to regenerate with:</span>
              </div>

              {/* New Chat Toggle */}
              <div className="regenerate-toggle-section">
                <label className="regenerate-toggle">
                  <input
                    type="checkbox"
                    checked={createNewChat}
                    onChange={(e) => setCreateNewChat(e.target.checked)}
                    className="regenerate-checkbox"
                  />
                  <div className="regenerate-toggle-slider"></div>
                  <div className="regenerate-toggle-content">
                    <ExternalLink size={14} />
                    <span>Branch to new chat</span>
                  </div>
                </label>
              </div>

              {/* Featured Models */}
              {getFeaturedModels().length > 0 && (
                <div className="featured-models-section">
                  <div className="section-header">
                    <Star size={12} />
                    <span>Featured</span>
                  </div>
                  {getFeaturedModels().map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleRegenerateWithModel(model.id)}
                      className={`model-item featured ${
                        !hasApiKey && model.id !== 'openai/gpt-4o-mini'
                          ? 'requires-api-key'
                          : ''
                      }`}
                      title={
                        !hasApiKey && model.id !== 'openai/gpt-4o-mini'
                          ? 'Requires API key - Click to add your OpenRouter API key'
                          : `${model.name} - ${model.pricing}`
                      }
                    >
                      <div className="model-info">
                        <div className="model-header">
                          <span className="model-title">{model.name}</span>
                          <span className="model-pricing">{model.pricing}</span>
                        </div>
                        <span className="model-desc">{model.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All Models by Provider */}
              <div className="all-models-section">
                <div className="section-header">
                  <span>All Models</span>
                </div>
                {Object.entries(availableModels).map(
                  ([providerId, provider]) => (
                    <div key={providerId} className="provider-group">
                      <div className="provider-name">{provider.name}</div>
                      {Object.entries(provider.models).map(
                        ([modelId, model]) => (
                          <button
                            key={modelId}
                            onClick={() => handleRegenerateWithModel(modelId)}
                            className={`model-item ${
                              !hasApiKey && modelId !== 'openai/gpt-4o-mini'
                                ? 'requires-api-key'
                                : ''
                            }`}
                            title={
                              !hasApiKey && modelId !== 'openai/gpt-4o-mini'
                                ? 'Requires API key - Click to add your OpenRouter API key'
                                : `${model.name} - ${model.pricing}`
                            }
                          >
                            <div className="model-info">
                              <div className="model-header">
                                <span className="model-title">
                                  {model.name}
                                </span>
                                <span className="model-pricing">
                                  {model.pricing}
                                </span>
                              </div>
                              <span className="model-desc">
                                {model.description}
                              </span>
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}

export default RegenerateDropdown
