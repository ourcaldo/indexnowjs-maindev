// Test Backend page integrated into dashboard layout
import { JobProcessorTest } from '@/components/job-processor-test';

export default function TestBackendPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Backend Processing Test</h1>
        <p className="text-[#1A1A1A] mt-1">
          Test the job processing system and Google API integration
        </p>
      </div>

      <JobProcessorTest />

      <div className="bg-[#F7F9FC] p-4 border border-[#E0E6ED] rounded-lg">
        <h3 className="font-semibold text-[#1A1A1A] mb-2">Setup Instructions:</h3>
        <div className="space-y-2 text-sm text-[#1A1A1A]">
          <p><strong>1. Database Schema:</strong> Run the SQL from <code>database-updates.sql</code> in your Supabase SQL Editor</p>
          <p><strong>2. Environment Variables:</strong> Ensure <code>ENCRYPTION_KEY</code> is set in your .env.local file</p>
          <p><strong>3. Service Accounts:</strong> Upload Google service account JSON files in Settings</p>
          <p><strong>4. Create Test Jobs:</strong> Create indexing jobs from the IndexNow page</p>
        </div>
      </div>
    </div>
  );
}