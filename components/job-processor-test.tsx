/**
 * Job Processor Test Component
 * A development/testing component for triggering manual rank checks
 * THIS FILE SHOULD BE DELETED AFTER TESTING IS COMPLETE
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface JobStatus {
  isRunning: boolean
  isScheduled: boolean
  nextRun: string | null
}

interface Stats {
  totalKeywords: number
  pendingChecks: number
  checkedToday: number
  completionRate: string
}

export function JobProcessorTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const handleTriggerManualCheck = async () => {
    setIsLoading(true)
    setLastResult(null)

    try {
      const response = await fetch('/api/v1/admin/rank-tracker/trigger-manual-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setLastResult(`✅ Manual rank check triggered at ${data.data.triggeredAt}`)
        // Refresh status after a short delay
        setTimeout(checkStatus, 1000)
      } else {
        setLastResult(`❌ Failed: ${data.error}`)
      }
    } catch (error) {
      setLastResult(`❌ Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/v1/admin/rank-tracker/trigger-manual-check')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.data.workerStatus.rankCheckJobStatus)
        setStats(data.data.currentStats)
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  const testSingleKeywordCheck = async () => {
    setIsLoading(true)
    setLastResult(null)

    try {
      // First, we need to get a keyword ID from the user's keywords
      // For testing, we'll use a placeholder - in real implementation, 
      // this would come from the keywords list
      const testKeywordId = 'test-keyword-id' // Replace with actual keyword ID
      
      const response = await fetch('/api/v1/rank-tracking/check-rank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword_id: testKeywordId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setLastResult(`✅ Single keyword check completed. Position: ${data.data.ranking?.position || 'Not found'}`)
      } else {
        setLastResult(`❌ Failed: ${data.error}`)
      }
    } catch (error) {
      setLastResult(`❌ Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-red-600">🔧 Rank Tracker Test Panel</CardTitle>
        <CardDescription className="text-red-500">
          Development/Testing Component - DELETE AFTER TESTING
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Job Status</h3>
          <div className="flex gap-2 mb-3">
            <Button onClick={checkStatus} variant="outline" size="sm">
              Refresh Status
            </Button>
          </div>
          
          {status && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Scheduler:</span>
                  <Badge variant={status.isScheduled ? "default" : "secondary"}>
                    {status.isScheduled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Running:</span>
                  <Badge variant={status.isRunning ? "destructive" : "outline"}>
                    {status.isRunning ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm">
                  <span className="font-medium">Next Run:</span> {status.nextRun || 'Not scheduled'}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Stats Section */}
        {stats && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Total Keywords: <span className="font-mono">{stats.totalKeywords}</span></div>
              <div>Pending Checks: <span className="font-mono">{stats.pendingChecks}</span></div>
              <div>Checked Today: <span className="font-mono">{stats.checkedToday}</span></div>
              <div>Completion: <span className="font-mono">{stats.completionRate}%</span></div>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Test Actions</h3>
          <div className="space-y-3">
            <Button 
              onClick={handleTriggerManualCheck} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Triggering...' : 'Trigger Manual Daily Check'}
            </Button>
            
            <Button 
              onClick={testSingleKeywordCheck} 
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              Test Single Keyword Check
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {lastResult && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3">Last Result</h3>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                {lastResult}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}