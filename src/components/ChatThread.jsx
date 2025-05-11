import { User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const Message = ({ role, content }) => (
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

const ChatThread = ({ messages, status, chatThreadRef }) => {
  const welcomeMessage = {
    role: 'assistant',
    content: "👋 Hello! I'm Lexi, your AI assistant. How can I help you?",
  }

  return (
    <div ref={chatThreadRef} className="message-container">
      {messages.length === 0 ? (
        <Message {...welcomeMessage} />
      ) : (
        messages.map((message, index) => <Message key={index} {...message} />)
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
