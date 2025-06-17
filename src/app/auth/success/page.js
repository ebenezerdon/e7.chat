'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { account } from '../../../lib/appwrite'

export default function AuthSuccess() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        // Check if user is authenticated
        const user = await account.get()
        if (user) {
          // Redirect to home page on successful authentication
          router.push('/')
        } else {
          // If no user found, redirect to home with error
          router.push('/?error=auth_failed')
        }
      } catch (error) {
        console.error('Authentication verification failed:', error)
        router.push('/?error=auth_failed')
      }
    }

    handleAuthSuccess()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1e24] to-[#1e2329] text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-300">Completing authentication...</p>
      </div>
    </div>
  )
}
