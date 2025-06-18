/**
 * Generates a versioned title for branched chats
 * @param {string} originalTitle - The original chat title
 * @returns {string} - The versioned title
 */
export const generateVersionedTitle = (originalTitle) => {
  if (!originalTitle) return '[2] New Chat'

  // Check if title already has a version number in square brackets at the start
  const versionMatch = originalTitle.match(/^\[(\d+)\]\s*(.+)$/)

  if (versionMatch) {
    // Title already has a version, increment it
    const currentVersion = parseInt(versionMatch[1])
    const titleWithoutVersion = versionMatch[2]
    return `[${currentVersion + 1}] ${titleWithoutVersion}`
  } else {
    // No version yet, add [2] to the beginning
    return `[2] ${originalTitle}`
  }
}
