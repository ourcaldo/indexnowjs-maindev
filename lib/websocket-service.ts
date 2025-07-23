import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { supabaseAdmin } from './supabase';

interface JobUpdate {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: {
    total_urls: number;
    processed_urls: number;
    successful_urls: number;
    failed_urls: number;
    progress_percentage: number;
  };
  current_url?: string;
  error_message?: string;
}

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  jobId?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ClientConnection>();

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: async (info: any) => {
        try {
          const url = new URL(info.req.url!, 'http://localhost');
          const token = url.searchParams.get('token');
          const userId = url.searchParams.get('userId');
          
          if (!token || !userId) {
            console.log('WebSocket connection rejected: Missing token or userId');
            return false;
          }

          // Verify JWT token with Supabase
          try {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            
            if (error || !user || user.id !== userId) {
              console.log('WebSocket connection rejected: Invalid JWT token or userId mismatch');
              return false;
            }

            // Verify user exists in our user profiles table
            const { data: profile, error: profileError } = await supabaseAdmin
              .from('indb_auth_user_profiles')
              .select('id')
              .eq('user_id', userId)
              .single();

            if (profileError || !profile) {
              console.log('WebSocket connection rejected: User profile not found');
              return false;
            }

            console.log(`WebSocket connection verified for user: ${userId}`);
            return true;
          } catch (authError) {
            console.log('WebSocket connection rejected: Token verification failed', authError);
            return false;
          }
        } catch (error) {
          console.error('WebSocket verification error:', error);
          return false;
        }
      }
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const url = new URL(request.url!, 'http://localhost');
      const userId = url.searchParams.get('userId');
      const jobId = url.searchParams.get('jobId');

      if (!userId) {
        ws.close(1008, 'Missing userId');
        return;
      }

      const clientId = this.generateClientId();
      const client: ClientConnection = { ws, userId, jobId: jobId || undefined };
      this.clients.set(clientId, client);

      console.log(`WebSocket client connected: ${clientId} (user: ${userId}, job: ${jobId})`);

      // Send initial connection confirmation
      this.sendToClient(clientId, {
        type: 'connection',
        message: 'Connected to IndexNow Pro WebSocket'
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });

    console.log('WebSocket server initialized on path /ws');
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe_job':
        client.jobId = message.jobId;
        this.sendToClient(clientId, {
          type: 'subscribed',
          jobId: message.jobId
        });
        break;
      
      case 'unsubscribe_job':
        client.jobId = undefined;
        this.sendToClient(clientId, {
          type: 'unsubscribed'
        });
        break;
        
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong'
        });
        break;
    }
  }

  broadcastJobUpdate(userId: string, jobId: string, update: Omit<JobUpdate, 'jobId'>): void {
    const message = {
      type: 'job_update',
      jobId,
      ...update
    };

    // Send to all clients of this user who are subscribed to this job
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && 
          (client.jobId === jobId || !client.jobId) && 
          client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, message);
      }
    });
  }

  broadcastToUser(userId: string, message: any): void {
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, message);
      }
    });
  }

  // Broadcast real-time dashboard statistics
  broadcastDashboardStats(userId: string, stats: any): void {
    const message = {
      type: 'dashboard_stats',
      stats
    };
    this.broadcastToUser(userId, message);
  }

  // Broadcast URL submission updates
  broadcastUrlSubmissionUpdate(userId: string, submission: any): void {
    const message = {
      type: 'url_submission_update',
      submission
    };
    this.broadcastToUser(userId, message);
  }

  // Broadcast job list updates for manage jobs page
  broadcastJobListUpdate(userId: string, jobs: any[]): void {
    const message = {
      type: 'job_list_update',
      jobs
    };
    this.broadcastToUser(userId, message);
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.clients.delete(clientId);
      }
    }
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  getClientsByUser(userId: string): number {
    return Array.from(this.clients.values())
      .filter(client => client.userId === userId).length;
  }
}