import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { User, LogOut, ChevronDown, Key } from 'lucide-react'

const UserMenu = ({ onOpenApiKeyModal, userApiKey }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const menuRef = useRef(null)
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    // Update hasApiKey based on the userApiKey prop
    setHasApiKey(!!userApiKey)
  }, [userApiKey])

  const handleLogout = async () => {
    try {
      await logout()
      setIsOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleApiKeyClick = () => {
    setIsOpen(false)
    onOpenApiKeyModal()
  }

  if (!user) return null

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="user-menu-button"
        aria-label="User menu"
      >
        <User size={18} />
        <span>{user.name || user.email}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div
            className="user-menu-item"
            style={{ fontWeight: '500', pointerEvents: 'none' }}
          >
            {user.email}
          </div>
          <button onClick={handleApiKeyClick} className="user-menu-item">
            <Key size={16} style={{ marginRight: '8px', display: 'inline' }} />
            {hasApiKey ? 'Manage API Key' : 'Add API Key'}
            {hasApiKey && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  color: '#22c55e',
                  fontWeight: '500',
                }}
              >
                ✓
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="user-menu-item danger">
            <LogOut
              size={16}
              style={{ marginRight: '8px', display: 'inline' }}
            />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
