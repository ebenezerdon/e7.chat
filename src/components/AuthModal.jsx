import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [error, setError] = useState('')

  const { login, register, loginWithGoogle, loginWithGitHub } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      onClose()
      resetForm()
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setOauthLoading('google')
    setError('')

    try {
      await loginWithGoogle()
      // Note: The redirect will happen automatically, so we don't close the modal here
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
      setOauthLoading(null)
    }
  }

  const handleGitHubSignIn = async () => {
    setOauthLoading('github')
    setError('')

    try {
      await loginWithGitHub()
      // Note: The redirect will happen automatically, so we don't close the modal here
    } catch (err) {
      setError(err.message || 'GitHub sign-in failed')
      setOauthLoading(null)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
    setError('')
    setShowPassword(false)
    setOauthLoading(null)
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="auth-modal-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <button
            onClick={onClose}
            className="auth-modal-close"
            aria-label="Close modal"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="auth-form">
          {/* OAuth Buttons */}
          <div className="oauth-buttons">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || oauthLoading}
              className="oauth-button google"
            >
              {oauthLoading === 'google' ? (
                <div className="oauth-loading">
                  <div className="loading-spinner"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={loading || oauthLoading}
              className="oauth-button github"
            >
              {oauthLoading === 'github' ? (
                <div className="oauth-loading">
                  <div className="loading-spinner"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <>
                  <GitHubIcon />
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </div>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="auth-email-form">
            {!isLogin && (
              <div className="auth-field">
                <User size={18} className="auth-field-icon" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="auth-input"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="auth-field">
              <Mail size={18} className="auth-field-icon" strokeWidth={1.5} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <Lock size={18} className="auth-field-icon" strokeWidth={1.5} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="auth-input"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              disabled={loading || oauthLoading}
              className="auth-submit"
            >
              {loading
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="auth-switch">
          <span>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={switchMode}
              className="auth-switch-button"
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

// Google Icon Component
const GoogleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

// GitHub Icon Component
const GitHubIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)

export default AuthModal
