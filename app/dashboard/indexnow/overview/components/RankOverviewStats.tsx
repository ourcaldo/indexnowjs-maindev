import React from 'react'
import { Search, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/dashboard/enhanced'

interface RankOverviewStatsProps {
  totalKeywords: number
  avgPosition: number
  topTenCount: number
  improvingCount: number
}

export const RankOverviewStats = ({
  totalKeywords,
  avgPosition,
  topTenCount,
  improvingCount
}: RankOverviewStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Keywords"
        value={totalKeywords.toLocaleString()}
        icon={<Search className="w-6 h-6" />}
      />
      
      <StatCard
        title="Average Position"
        value={avgPosition}
        icon={<TrendingUp className="w-6 h-6" style={{color: '#F0A202'}} />}
      />
      
      <StatCard
        title="Top 10 Rankings"
        value={topTenCount}
        icon={
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{backgroundColor: '#4BB543'}}>
            10
          </div>
        }
      />
      
      <StatCard
        title="Improving (1D)"
        value={improvingCount}
        icon={<TrendingUp className="w-6 h-6" style={{color: '#4BB543'}} />}
      />
    </div>
  )
}