import { User, Download, Loader2, Check, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'
import ImageGenerationAnimation from './ImageGenerationAnimation'
import CodeBlock from './CodeBlock'

const Message = ({
  role,
  content,
  isSaving,
  type,
  imageData,
  imagePrompt,
  experimental_attachments,
}) => {
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
            <ReactMarkdown
              components={{
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-gray-100 mt-6 mb-4 border-b border-gray-700 pb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-gray-100 mt-5 mb-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-semibold text-gray-200 mt-3 mb-2">
                    {children}
                  </h4>
                ),
                h5: ({ children }) => (
                  <h5 className="text-sm font-semibold text-gray-300 mt-3 mb-2">
                    {children}
                  </h5>
                ),
                h6: ({ children }) => (
                  <h6 className="text-sm font-medium text-gray-300 mt-2 mb-1">
                    {children}
                  </h6>
                ),

                // Paragraphs
                p: ({ children }) => (
                  <p className="text-gray-200 mb-4 leading-relaxed">
                    {children}
                  </p>
                ),

                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc list-outside text-gray-200 mb-4 space-y-2 pl-6">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside text-gray-200 mb-4 space-y-2 pl-6">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-200 leading-relaxed pl-2">
                    {children}
                  </li>
                ),

                // Links
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300/70 transition-colors"
                  >
                    {children}
                  </a>
                ),

                // Emphasis
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-100">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-200">{children}</em>
                ),

                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500/50 pl-4 my-4 text-gray-300 italic bg-gray-800/30 py-2 rounded-r">
                    {children}
                  </blockquote>
                ),

                // Horizontal rule
                hr: () => <hr className="border-gray-700 my-6" />,

                // Code
                code: ({ node, inline, className, children, ...props }) => {
                  // Check if this should be treated as inline code
                  const codeContent = String(children).trim()

                  // If it's marked as inline OR it's short and has no language class, treat as inline
                  if (
                    inline ||
                    (!className &&
                      codeContent.length <= 20 &&
                      !codeContent.includes('\n'))
                  ) {
                    return (
                      <code
                        className="bg-gray-800/70 text-blue-200 px-2 py-1 rounded-md text-sm font-mono border border-gray-700/50"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }

                  return (
                    <CodeBlock className={className} {...props}>
                      {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                  )
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Display attachments */}
          {experimental_attachments && experimental_attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {experimental_attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  {attachment.contentType?.startsWith('image/') ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={attachment.url}
                        alt={attachment.name || `attachment-${index}`}
                        className="w-16 h-16 object-cover rounded border border-gray-300"
                        loading="lazy"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {attachment.name || `Image ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          Image attachment
                        </div>
                      </div>
                    </div>
                  ) : attachment.contentType === 'application/pdf' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {attachment.name || `Document ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          PDF attachment
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

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
