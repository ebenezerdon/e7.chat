import { createContext, useContext, useState, useEffect } from 'react'
import { account } from './appwrite'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const login = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password)
      const userData = await account.get()
      setUser(userData)
      return userData
    } catch (error) {
      throw error
    }
  }

  const register = async (email, password, name) => {
    try {
      await account.create('unique()', email, password, name)
      await login(email, password)
      return await account.get()
    } catch (error) {
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      // Use current origin for redirect URLs
      const currentOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000'

      console.log('Current origin being used:', currentOrigin)
      console.log('Success URL:', `${currentOrigin}/auth/success`)
      console.log('Failure URL:', `${currentOrigin}/auth/failure`)

      account.createOAuth2Session(
        'google',
        `${currentOrigin}/auth/success`, // Success redirect
        `${currentOrigin}/auth/failure`, // Failure redirect
      )
    } catch (error) {
      throw error
    }
  }

  const loginWithGitHub = async () => {
    try {
      // Use current origin for redirect URLs
      const currentOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000'

      console.log('GitHub Current origin being used:', currentOrigin)
      console.log('GitHub Success URL:', `${currentOrigin}/auth/success`)
      console.log('GitHub Failure URL:', `${currentOrigin}/auth/failure`)

      account.createOAuth2Session(
        'github',
        `${currentOrigin}/auth/success`, // Success redirect
        `${currentOrigin}/auth/failure`, // Failure redirect
      )
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const checkAuth = async () => {
    try {
      const userData = await account.get()
      setUser(userData)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value = {
    user,
    login,
    register,
    loginWithGoogle,
    loginWithGitHub,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
