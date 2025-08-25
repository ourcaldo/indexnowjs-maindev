// Socket.io broadcaster service for server-side message broadcasting
import { Server } from 'socket.io';

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

export class SocketIOBroadcaster {
  private static instance: SocketIOBroadcaster;
  private io: Server | null = null;

  static getInstance(): SocketIOBroadcaster {
    if (!SocketIOBroadcaster.instance) {
      SocketIOBroadcaster.instance = new SocketIOBroadcaster();
    }
    return SocketIOBroadcaster.instance;
  }

  setIO(io: Server): void {
    this.io = io;
    console.log('✅ Socket.io broadcaster initialized');
  }

  getIO(): Server | null {
    return this.io || (global as any).socketIo || null;
  }

  // Broadcast job updates with delay for completion status
  broadcastJobUpdate(userId: string, jobId: string, update: Omit<JobUpdate, 'jobId'>): void {
    const io = this.getIO();
    if (!io) {
      console.warn('Socket.io not available for broadcasting job update');
      return;
    }

    const message = {
      type: 'job_update',
      jobId,
      ...update
    };

    console.log(`📡 Broadcasting job update for job ${jobId}:`, update);

    // For completion status, add a small delay to ensure clients are connected
    const broadcastDelay = update.status === 'completed' ? 1000 : 0;
    
    setTimeout(() => {
      // Send to specific job room
      io.to(`job-${jobId}`).emit('job_update', message);
      
      // Send to all connections from this user
      io.sockets.sockets.forEach((socket: any) => {
        if (socket.userId === userId) {
          socket.emit('job_update', message);
        }
      });
      
      if (update.status === 'completed') {
        console.log(`✅ Completion broadcast sent for job ${jobId} after delay`);
      }
    }, broadcastDelay);
  }

  // Enhanced job progress broadcast
  broadcastJobProgress(userId: string, jobId: string, progress: any, currentUrl?: string): void {
    const io = this.getIO();
    if (!io) {
      console.warn('Socket.io not available for broadcasting job progress');
      return;
    }

    const message = {
      type: 'job_progress',
      jobId,
      progress,
      current_url: currentUrl,
      timestamp: new Date().toISOString()
    };

    console.log(`📡 Broadcasting job progress for job ${jobId}:`, progress);
    
    // Send to specific job room
    io.to(`job-${jobId}`).emit('job_progress', message);
    
    // Send to all connections from this user
    io.sockets.sockets.forEach((socket: any) => {
      if (socket.userId === userId) {
        socket.emit('job_progress', message);
      }
    });
  }

  // Broadcast to specific user
  broadcastToUser(userId: string, event: string, data: any): void {
    const io = this.getIO();
    if (!io) {
      console.warn('Socket.io not available for broadcasting to user');
      return;
    }

    io.sockets.sockets.forEach((socket: any) => {
      if (socket.userId === userId) {
        socket.emit(event, data);
      }
    });
  }

  // Broadcast dashboard statistics
  broadcastDashboardStats(userId: string, stats: any): void {
    const message = {
      type: 'dashboard_stats',
      stats
    };
    this.broadcastToUser(userId, 'dashboard_stats', message);
  }

  // Broadcast URL submission updates
  broadcastUrlSubmissionUpdate(userId: string, submission: any): void {
    const message = {
      type: 'url_submission_update',
      submission
    };
    console.log(`📡 Broadcasting URL submission update to user ${userId}:`, submission);
    this.broadcastToUser(userId, 'url_submission_update', message);
  }

  // Broadcast URL status changes
  broadcastUrlStatusChange(userId: string, jobId: string, urlSubmission: any): void {
    const message = {
      type: 'url_status_change',
      jobId,
      submission: urlSubmission
    };
    console.log(`📡 Broadcasting URL status change for job ${jobId}:`, urlSubmission);
    this.broadcastToUser(userId, 'url_status_change', message);
  }

  // Broadcast job list updates
  broadcastJobListUpdate(userId: string, jobs: any[]): void {
    const message = {
      type: 'job_list_update',
      jobs
    };
    this.broadcastToUser(userId, 'job_list_update', message);
  }

  // Get connection stats
  getConnectionStats(): { totalConnections: number; connectedUsers: string[] } {
    const io = this.getIO();
    if (!io) {
      return { totalConnections: 0, connectedUsers: [] };
    }

    const connectedUsers: string[] = [];
    io.sockets.sockets.forEach((socket: any) => {
      if (socket.userId) {
        connectedUsers.push(socket.userId);
      }
    });

    return {
      totalConnections: io.sockets.sockets.size,
      connectedUsers: Array.from(new Set(connectedUsers)) // Remove duplicates
    };
  }
}