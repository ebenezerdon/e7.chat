import { useState } from 'react'
import { Image, Loader2, Download } from 'lucide-react'

const ImageGenerator = ({ onImageGenerated, disabled, userOpenAiKey }) => {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [error, setError] = useState('')

  console.log('ImageGenerator props:', {
    onImageGenerated: !!onImageGenerated,
    disabled,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    console.log('Form submitted:', { prompt, disabled })

    if (!prompt.trim() || disabled) {
      console.log('Submission blocked:', {
        emptyPrompt: !prompt.trim(),
        disabled,
      })
      return
    }

    setIsGenerating(true)
    setError('')
    setGeneratedImage(null)

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userOpenAiKey && { 'X-User-API-Key': userOpenAiKey }),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: '1024x1024',
          quality: 'standard',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image')
      }

      const imageData = {
        url: data.imageUrl,
        prompt: prompt.trim(),
        revisedPrompt: data.revisedPrompt,
        timestamp: new Date().toISOString(),
      }

      setGeneratedImage(imageData)

      // Call the callback to add the image to the chat
      if (onImageGenerated) {
        console.log('Calling onImageGenerated with:', imageData)
        onImageGenerated(
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: `Generate an image: ${prompt.trim()}`,
            type: 'image-request',
          },
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `I've generated an image based on your prompt: "${prompt.trim()}"`,
            type: 'image-response',
            imageData: imageData,
          },
        )
      }

      setPrompt('')
    } catch (error) {
      console.error('Image generation failed:', error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'generated-image.png'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className="image-generator">
      <form onSubmit={handleSubmit} className="image-form">
        <div className="image-input-wrapper">
          <Image className="image-icon" size={18} />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            disabled={disabled || isGenerating}
            className="image-input"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || disabled || isGenerating}
            className="generate-button"
          >
            {isGenerating ? (
              <Loader2 className="loading-icon" size={18} />
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {generatedImage && (
        <div className="generated-image-preview">
          <img
            src={generatedImage.url}
            alt={generatedImage.prompt}
            className="preview-image"
          />
          <div className="image-actions">
            <button
              onClick={() =>
                handleDownload(
                  generatedImage.url,
                  `generated-${Date.now()}.png`,
                )
              }
              className="download-button"
            >
              <Download size={16} />
              Download
            </button>
          </div>
          {generatedImage.revisedPrompt &&
            generatedImage.revisedPrompt !== generatedImage.prompt && (
              <p className="revised-prompt">
                <strong>Revised prompt:</strong> {generatedImage.revisedPrompt}
              </p>
            )}
        </div>
      )}
    </div>
  )
}

export default ImageGenerator
