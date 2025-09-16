
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarProps {
  selectedRange: { start: string; end: string }
  onRangeChange: (start: string, end: string) => void
}

export const DateRangeCalendar = ({ selectedRange, onRangeChange }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tempStart, setTempStart] = useState<string | null>(null)
  const [tempEnd, setTempEnd] = useState<string | null>(null)

  // Get the start of current month and next month
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const isDateInRange = (dateStr: string): boolean => {
    if (!selectedRange.start || !selectedRange.end) return false
    return dateStr >= selectedRange.start && dateStr <= selectedRange.end
  }

  const isDateSelected = (dateStr: string): boolean => {
    return dateStr === selectedRange.start || dateStr === selectedRange.end
  }

  const handleDateClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // Start new selection
      setTempStart(dateStr)
      setTempEnd(null)
      onRangeChange(dateStr, dateStr)
    } else if (tempStart && !tempEnd) {
      // Complete selection
      const start = tempStart <= dateStr ? tempStart : dateStr
      const end = tempStart <= dateStr ? dateStr : tempStart
      setTempStart(start)
      setTempEnd(end)
      onRangeChange(start, end)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderCalendar = (monthStart: Date) => {
    const year = monthStart.getFullYear()
    const month = monthStart.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday of the first week

    const days = []
    const currentIterDate = new Date(startDate)

    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dateStr = formatDateString(currentIterDate)
        const isCurrentMonth = currentIterDate.getMonth() === month
        const isToday = formatDateString(currentIterDate) === formatDateString(new Date())
        const isInRange = isDateInRange(dateStr)
        const isSelected = isDateSelected(dateStr)

        days.push(
          <button
            key={dateStr}
            onClick={() => isCurrentMonth && handleDateClick(dateStr)}
            disabled={!isCurrentMonth}
            className={`
              w-8 h-8 text-sm flex items-center justify-center transition-colors duration-150
              ${!isCurrentMonth 
                ? 'text-muted-foreground/50 cursor-not-allowed' 
                : 'text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
              }
              ${isToday && isCurrentMonth ? 'ring-2 ring-primary ring-inset' : ''}
              ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              ${isInRange && !isSelected ? 'bg-slate-50 dark:bg-slate-800' : ''}
            `}
          >
            {currentIterDate.getDate()}
          </button>
        )

        currentIterDate.setDate(currentIterDate.getDate() + 1)
      }
    }

    return (
      <div className="select-none">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-xs text-muted-foreground text-center py-1 font-medium">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0">
          {days}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Navigation and Current Month */}
      <div className="min-w-[250px]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors duration-150"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {renderCalendar(currentMonthStart)}
      </div>

      {/* Next Month */}
      <div className="min-w-[250px]">
        <div className="flex items-center justify-center mb-4">
          <span className="text-sm font-medium">
            {monthNames[nextMonthStart.getMonth()]} {nextMonthStart.getFullYear()}
          </span>
        </div>
        {renderCalendar(nextMonthStart)}
      </div>
    </div>
  )
}
