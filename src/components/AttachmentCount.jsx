import { X, Paperclip } from 'lucide-react'

const AttachmentCount = ({ files, onClear }) => {
  if (!files || files.length === 0) return null

  const getFileTypeDescription = () => {
    const fileArray = Array.from(files)
    const images = fileArray.filter((file) => file.type.startsWith('image/'))
    const pdfs = fileArray.filter((file) => file.type === 'application/pdf')

    const descriptions = []

    if (images.length > 0) {
      descriptions.push(
        `${images.length} image${images.length !== 1 ? 's' : ''}`,
      )
    }

    if (pdfs.length > 0) {
      descriptions.push(`${pdfs.length} PDF${pdfs.length !== 1 ? 's' : ''}`)
    }

    return descriptions.join(', ') + ' attached'
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-full text-xs font-medium text-blue-400 backdrop-blur-sm">
      <Paperclip size={12} className="text-blue-400" />
      <span>{getFileTypeDescription()}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 p-0.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-full transition-all duration-150"
        title="Clear attachments"
      >
        <X size={10} />
      </button>
    </div>
  )
}

export default AttachmentCount
