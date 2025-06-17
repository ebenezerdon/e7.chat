'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, Star } from 'lucide-react'

const ModelSelector = ({ selectedModel = 'openai/gpt-4o', onModelChange }) => {
  const [providers, setProviders] = useState({})
  const [featuredModels, setFeaturedModels] = useState([])
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
        setFeaturedModels(data.featured || [])
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Find current model info
  const getCurrentModelInfo = () => {
    for (const [providerId, provider] of Object.entries(providers)) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        if (modelId === selectedModel) {
          return {
            name: model.name,
            description: model.description,
            provider: provider.name,
            pricing: model.pricing,
            featured: model.featured,
          }
        }
      }
    }

    // Fallback if model not found
    return {
      name: selectedModel.split('/').pop() || 'GPT-4o',
      description: 'AI Model',
      provider: 'Unknown',
    }
  }

  // Get featured models for quick access
  const getFeaturedModels = () => {
    const featured = []
    for (const [providerId, provider] of Object.entries(providers)) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        if (featuredModels.includes(modelId)) {
          featured.push({
            id: modelId,
            name: model.name,
            description: model.description,
            pricing: model.pricing,
            provider: provider.name,
          })
        }
      }
    }
    return featured
  }

  const currentModelInfo = getCurrentModelInfo()
  const featured = getFeaturedModels()

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
        title={`${currentModelInfo.name} (${currentModelInfo.provider}) - ${
          currentModelInfo.pricing || 'Pricing varies'
        }`}
      >
        <div className="model-display">
          <span className="model-name">{currentModelInfo.name}</span>
          {currentModelInfo.featured && <Star className="featured-icon" />}
        </div>
        <ChevronDown className={`chevron ${showModels ? 'rotate' : ''}`} />
      </button>

      {showModels && (
        <div className="model-dropdown">
          {/* Featured Models Section */}
          {featured.length > 0 && (
            <div className="featured-section">
              <div className="section-header">
                <Star className="section-icon" />
                <span>Featured Models</span>
              </div>
              {featured.map((model) => (
                <button
                  key={model.id}
                  ref={selectedModel === model.id ? scrollToSelected : null}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onModelChange(model.id)
                    setShowModels(false)
                  }}
                  className={`model-item featured ${
                    selectedModel === model.id ? 'active' : ''
                  }`}
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
            {Object.entries(providers).map(([providerId, provider]) => (
              <div key={providerId} className="provider-group">
                <div className="provider-name">{provider.name}</div>
                {Object.entries(provider.models).map(([modelId, model]) => (
                  <button
                    key={modelId}
                    ref={selectedModel === modelId ? scrollToSelected : null}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onModelChange(modelId)
                      setShowModels(false)
                    }}
                    className={`model-item ${
                      selectedModel === modelId ? 'active' : ''
                    } ${model.featured ? 'has-featured' : ''}`}
                  >
                    <div className="model-info">
                      <div className="model-header">
                        <span className="model-title">
                          {model.name}
                          {model.featured && (
                            <Star className="featured-badge" />
                          )}
                        </span>
                        <span className="model-pricing">{model.pricing}</span>
                      </div>
                      <span className="model-desc">{model.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelector
