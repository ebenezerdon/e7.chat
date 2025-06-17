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
    <div className="my-6 rounded-xl bg-[#0f0f0f] border border-gray-800/50 overflow-hidden shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/30 border-b border-gray-800/50">
        {/* Language label */}
        <div className="flex items-center gap-2">
          {language && language !== 'text' && (
            <span className="text-gray-400 text-sm font-medium">
              {language}
            </span>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-all duration-200 text-sm"
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={customTheme}
          customStyle={{
            backgroundColor: 'transparent',
            margin: '0',
            padding: '20px',
            fontSize: '15px',
            lineHeight: '1.6',
            border: 'none',
            borderRadius: '0',
          }}
          codeTagProps={{
            style: {
              fontSize: '15px',
              lineHeight: '1.6',
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
          }}
          {...props}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default CodeBlock
