/**
 * Detects if a message is requesting image generation and extracts the prompt
 * @param {string} message - The user's message
 * @returns {string|null} - The extracted prompt or null if not an image request
 */
export const detectImageRequest = (message) => {
  const lowerMessage = message.toLowerCase().trim()

  // Keywords that trigger image generation
  const imageKeywords = [
    'generate image',
    'generate an image',
    'create image',
    'create an image',
    'make image',
    'make an image',
    'draw image',
    'draw an image',
    'generate picture',
    'create picture',
    'make picture',
    'draw picture',
    'image of',
    'picture of',
    'show me image',
    'show me picture',
    'visualize',
    'illustrate',
  ]

  // Check if message starts with any image keywords
  for (const keyword of imageKeywords) {
    if (lowerMessage.startsWith(keyword)) {
      // Extract the prompt (everything after the keyword)
      const prompt = message.substring(keyword.length).trim()
      // Remove common connecting words at the beginning
      const cleanedPrompt = prompt
        .replace(/^(of|for|:|about|showing|with)\s*/i, '')
        .trim()
      return cleanedPrompt || prompt
    }
  }

  // Check if message contains "generate/create/make/draw + image/picture" with optional adjectives
  const containsPattern =
    /\b(generate|create|make|draw|show me)\s+(an?\s+)?([a-z\s]*\s+)?(image|picture|photo)\s+(of|for|showing|with)?\s*(.+)/i
  const match = lowerMessage.match(containsPattern)
  if (match && match[6]) {
    return match[6].trim()
  }

  return null
}
