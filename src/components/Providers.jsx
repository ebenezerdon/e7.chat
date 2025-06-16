'use client'

import { AuthProvider } from '../lib/auth'

const Providers = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>
}

export default Providers
