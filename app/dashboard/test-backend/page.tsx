'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestBackendPage() {
  const [debugResult, setDebugResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testEncryptionDebug = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/encryption-debug')
      const data = await response.json()
      setDebugResult(data)
    } catch (error) {
      setDebugResult({ error: 'Failed to fetch debug info' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Backend Testing</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encryption Debug</CardTitle>
          <CardDescription>
            Test encryption/decryption and service account status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testEncryptionDebug}
            disabled={loading}
            className="mb-4 bg-[#1C2331] hover:bg-[#0d1b2a] text-white"
          >
            {loading ? 'Testing...' : 'Test Encryption'}
          </Button>

          {debugResult && (
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}