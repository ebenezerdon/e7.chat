'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default function AuthFailure() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page after a short delay
    const timer = setTimeout(() => {
      router.push('/?error=oauth_failed')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1e24] to-[#1e2329] text-white">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">
          Authentication Failed
        </h1>
        <p className="text-gray-400 mb-6">
          We encountered an issue while trying to sign you in. You&apos;ll be
          redirected back to continue.
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-lg transition-all duration-200"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
