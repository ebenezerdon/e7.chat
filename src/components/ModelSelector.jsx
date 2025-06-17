'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

const ModelSelector = ({
  selectedProvider = 'openai',
  selectedModel,
  onProviderChange,
  onModelChange,
}) => {
  const [providers, setProviders] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModels, setShowModels] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    fetchProviders()
  }, [])

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowModels(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowModels(false)
      }
    }

    if (showModels) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showModels])

  // Callback ref that scrolls to selected model when rendered
  const scrollToSelected = useCallback((node) => {
    if (node) {
      node.scrollIntoView({
        behavior: 'auto',
        block: 'center',
      })
    }
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/chat')
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || {})
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentProvider = providers[selectedProvider]
  const currentModel = selectedModel || currentProvider?.defaultModel
  const modelName = currentProvider?.models[currentModel]?.name || 'GPT-4o'

  if (loading) {
    return (
      <div className="model-selector-pill loading">
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="model-selector-container" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowModels(!showModels)
        }}
        className="model-selector-pill"
      >
        <span className="model-name">{modelName}</span>
        <ChevronDown className={`chevron ${showModels ? 'rotate' : ''}`} />
      </button>

      {showModels && (
        <div className="model-dropdown">
          {Object.entries(providers).map(([providerId, provider]) => (
            <div key={providerId} className="provider-group">
              <div className="provider-name">{provider.name}</div>
              {Object.entries(provider.models).map(([modelId, model]) => (
                <button
                  key={modelId}
                  ref={
                    selectedProvider === providerId && currentModel === modelId
                      ? scrollToSelected
                      : null
                  }
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onProviderChange(providerId)
                    onModelChange(modelId)
                    setShowModels(false)
                  }}
                  className={`model-item ${
                    selectedProvider === providerId && currentModel === modelId
                      ? 'active'
                      : ''
                  }`}
                >
                  <div className="model-info">
                    <span className="model-title">{model.name}</span>
                    <span className="model-desc">{model.description}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModelSelector
