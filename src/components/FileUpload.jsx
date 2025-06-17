'use client'

import { useRef } from 'react'
import { Paperclip, X, FileText, Image } from 'lucide-react'

const FileUpload = ({
  onFilesChange,
  files = null,
  showAttachmentsList = true,
}) => {
  const fileInputRef = useRef(null)

  const ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_FILES = 5

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)

    // Validate files
    const validFiles = selectedFiles.filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(
          `File type ${file.type} is not supported. Please upload images (JPG, PNG, GIF, WebP) or PDF files.`,
        )
        return false
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) {
      e.target.value = ''
      return
    }

    // Check total file count
    const currentCount = files ? files.length : 0
    if (currentCount + validFiles.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed`)
      e.target.value = ''
      return
    }

    // Create FileList-like object
    const dataTransfer = new DataTransfer()

    // Add existing files
    if (files) {
      Array.from(files).forEach((file) => dataTransfer.items.add(file))
    }

    // Add new files
    validFiles.forEach((file) => dataTransfer.items.add(file))

    onFilesChange(dataTransfer.files)
    e.target.value = ''
  }

  const removeFile = (indexToRemove) => {
    if (!files) return

    const dataTransfer = new DataTransfer()
    Array.from(files).forEach((file, index) => {
      if (index !== indexToRemove) {
        dataTransfer.items.add(file)
      }
    })

    onFilesChange(dataTransfer.files.length > 0 ? dataTransfer.files : null)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const clearAllFiles = () => {
    onFilesChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center"
        title="Attach files (Images, PDFs)"
      >
        <Paperclip size={18} />
      </button>

      {/* File list - only show if showAttachmentsList is true */}
      {showAttachmentsList && files && files.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
            <span className="text-sm text-gray-600 font-medium">
              {files.length} file{files.length !== 1 ? 's' : ''} attached
            </span>
            <button
              type="button"
              onClick={clearAllFiles}
              className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              title="Remove all files"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {Array.from(files).map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              >
                <div className="text-gray-500 flex-shrink-0">
                  {file.type.startsWith('image/') ? (
                    <Image size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium text-gray-900 truncate"
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                {file.type.startsWith('image/') && (
                  <div className="flex-shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-8 h-8 object-cover rounded border border-gray-200"
                      onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
