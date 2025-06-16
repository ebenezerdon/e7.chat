import { User, Download, Loader2, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'
import ImageGenerationAnimation from './ImageGenerationAnimation'

const Message = ({ role, content, isSaving, type, imageData, imagePrompt }) => {
  const [downloadState, setDownloadState] = useState('idle') // idle, downloading, success
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadText, setDownloadText] = useState('Download')

  const handleDownload = async (imageUrl, filename) => {
    if (downloadState !== 'idle') return // Prevent multiple downloads

    try {
      setDownloadState('downloading')
      setDownloadProgress(0)

      const downloadFilename = filename || `generated-${Date.now()}.png`

      // Simulate progress with engaging text updates
      const progressTexts = [
        'Preparing download...',
        'Fetching image...',
        'Processing file...',
        'Almost ready...',
        'Downloading...',
      ]

      // Animate progress bar and text
      let currentProgress = 0
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 25 + 10
        if (currentProgress > 95) currentProgress = 95

        setDownloadProgress(currentProgress)
        const textIndex = Math.floor(
          (currentProgress / 100) * progressTexts.length,
        )
        setDownloadText(
          progressTexts[Math.min(textIndex, progressTexts.length - 1)],
        )
      }, 150)

      // Use our proxy API route to download the image
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(
        imageUrl,
      )}&filename=${encodeURIComponent(downloadFilename)}`

      // Create a temporary link and trigger download
      const a = document.createElement('a')
      a.href = proxyUrl
      a.download = downloadFilename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Complete the progress after download starts
      setTimeout(() => {
        clearInterval(progressInterval)
        setDownloadProgress(100)
        setDownloadText('Ready to save')
        setDownloadState('success')

        // Reset after showing success
        setTimeout(() => {
          setDownloadState('idle')
          setDownloadProgress(0)
          setDownloadText('Download')
        }, 2000)
      }, 800)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download image. Please try again.')
      setDownloadState('idle')
      setDownloadProgress(0)
      setDownloadText('Download')
    }
  }

  return (
    <div className="message-wrapper">
      {role === 'user' ? (
        <div className="user-avatar">
          <User className="user-avatar-icon" strokeWidth={1.5} />
        </div>
      ) : (
        <div className="ai-avatar">AI</div>
      )}
      <div className="message-content-wrapper">
        <span className="message-sender">
          {role === 'user' ? 'You' : 'AI Assistant'}
          {isSaving && (
            <span className="saving-indicator" title="Saving message...">
              ●
            </span>
          )}
        </span>
        <div
          className={`message-content ${
            role === 'user' ? 'user-message-bg' : 'ai-message-bg'
          }`}
        >
          <div className="markdown-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          {type === 'loading' && (
            <div className="loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {type === 'image-generating' && (
            <ImageGenerationAnimation prompt={imagePrompt} />
          )}

          {type === 'image-response' && imageData && (
            <div className="generated-image-display">
              <img
                src={imageData.url}
                alt={imageData.prompt}
                className="chat-generated-image"
              />
              <div className="image-actions">
                <button
                  onClick={() =>
                    handleDownload(imageData.url, `generated-${Date.now()}.png`)
                  }
                  className={`download-button ${
                    downloadState !== 'idle' ? 'downloading' : ''
                  } ${downloadState === 'success' ? 'success' : ''}`}
                  disabled={downloadState !== 'idle'}
                >
                  <div className="download-button-content">
                    <div className="download-icon-container">
                      {downloadState === 'downloading' && (
                        <div className="download-pulse"></div>
                      )}
                      {downloadState === 'idle' && <Download size={16} />}
                      {downloadState === 'downloading' && (
                        <Download size={16} className="download-bounce" />
                      )}
                      {downloadState === 'success' && (
                        <Check size={16} className="download-success" />
                      )}
                    </div>
                    <span className="download-text">{downloadText}</span>
                  </div>
                  {downloadState === 'downloading' && (
                    <div className="download-progress-container">
                      <div
                        className="download-progress-bar"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ChatThread = ({
  messages,
  status,
  chatThreadRef,
  savingMessages = new Set(),
}) => {
  const welcomeMessage = {
    role: 'assistant',
    content: "👋 Hello! I'm Lexi, your AI assistant. How can I help you?",
  }

  return (
    <div ref={chatThreadRef} className="message-container">
      {messages.length === 0 ? (
        <Message {...welcomeMessage} />
      ) : (
        messages.map((message, index) => (
          <Message
            key={message.id || index}
            {...message}
            isSaving={savingMessages.has(message.id || index)}
          />
        ))
      )}

      {status === 'submitted' && (
        <div className="thinking-row">
          <div className="ai-avatar">AI</div>
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatThread
