import { supabase } from '@/lib/supabase'

interface ActivityLogParams {
  eventType: string
  actionDescription: string
  targetType?: string
  targetId?: string
  metadata?: any
}

export class UserActivityLogger {
  static async logActivity(params: ActivityLogParams): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch('/api/admin/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          event_type: params.eventType,
          action_description: params.actionDescription,
          target_type: params.targetType,
          target_id: params.targetId,
          metadata: params.metadata
        })
      })
    } catch (error) {
      console.error('Failed to log user activity:', error)
    }
  }

  // Convenience methods for common activities
  static async logPageView(pageName: string, metadata?: any): Promise<void> {
    return this.logActivity({
      eventType: 'page_view',
      actionDescription: `Viewed ${pageName} page`,
      targetType: 'page',
      targetId: pageName,
      metadata
    })
  }

  static async logAction(action: string, description: string, targetType?: string, targetId?: string, metadata?: any): Promise<void> {
    return this.logActivity({
      eventType: action,
      actionDescription: description,
      targetType,
      targetId,
      metadata
    })
  }

  static async logFormSubmission(formType: string, description: string, metadata?: any): Promise<void> {
    return this.logActivity({
      eventType: 'form_submission',
      actionDescription: description,
      targetType: 'form',
      targetId: formType,
      metadata
    })
  }

  static async logButtonClick(buttonName: string, description: string, metadata?: any): Promise<void> {
    return this.logActivity({
      eventType: 'button_click',
      actionDescription: description,
      targetType: 'button',
      targetId: buttonName,
      metadata
    })
  }

  static async logNavigation(from: string, to: string, metadata?: any): Promise<void> {
    return this.logActivity({
      eventType: 'navigation',
      actionDescription: `Navigated from ${from} to ${to}`,
      targetType: 'navigation',
      metadata: { from, to, ...metadata }
    })
  }
}