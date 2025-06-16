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
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
