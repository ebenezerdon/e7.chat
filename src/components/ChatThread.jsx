import { User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const Message = ({ role, content, isSaving }) => (
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
      </div>
    </div>
  </div>
)

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
