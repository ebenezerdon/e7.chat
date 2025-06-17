'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

const CodeBlock = ({ children, className, ...props }) => {
  const [copied, setCopied] = useState(false)

  // Extract language from className (e.g., "language-javascript" -> "javascript")
  const language = className?.replace(/language-/, '') || 'text'

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  // Custom minimal dark theme
  const customTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      backgroundColor: '#0f0f0f',
      margin: '0',
      padding: '0',
      fontSize: '15px',
      lineHeight: '1.6',
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      border: 'none',
      borderRadius: '0',
      overflow: 'visible',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      backgroundColor: 'transparent',
      fontSize: '15px',
      lineHeight: '1.6',
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  }

  return (
    <div className="code-block-wrapper w-full max-w-full">
      <div className="code-block-container my-4 sm:my-6 rounded-xl bg-[#0f0f0f] border border-gray-800/50 overflow-hidden shadow-lg w-full max-w-full">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/30 border-b border-gray-800/50">
          {/* Language label */}
          <div className="flex items-center gap-2 min-w-0">
            {language && language !== 'text' && (
              <span className="text-gray-400 text-xs sm:text-sm font-medium truncate">
                {language}
              </span>
            )}
          </div>

          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-xs sm:text-sm flex-shrink-0"
            title={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check size={12} className="text-green-400 sm:w-3.5 sm:h-3.5" />
                <span className="text-green-400 hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code content */}
        <div
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 w-full"
          style={{
            overflowX: 'auto',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <SyntaxHighlighter
            language={language}
            style={customTheme}
            customStyle={{
              backgroundColor: 'transparent',
              margin: '0',
              padding: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
              border: 'none',
              borderRadius: '0',
              minWidth: 'max-content',
              width: 'max-content',
              overflowX: 'visible',
            }}
            codeTagProps={{
              style: {
                fontSize: '13px',
                lineHeight: '1.5',
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                whiteSpace: 'pre',
                overflowWrap: 'normal',
                wordBreak: 'keep-all',
              },
            }}
            wrapLongLines={false}
            {...props}
          >
            {children}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}

export default CodeBlock
