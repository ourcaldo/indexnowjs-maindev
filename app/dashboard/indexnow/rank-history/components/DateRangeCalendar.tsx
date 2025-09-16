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
  // Dummy state for custom start and end dates, as they are used in the quick select logic
  const [customStartDate, setCustomStartDate] = useState<string | null>(null)
  const [customEndDate, setCustomEndDate] = useState<string | null>(null)

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

  const isStartDate = (dateStr: string): boolean => {
    return dateStr === selectedRange.start
  }

  const isEndDate = (dateStr: string): boolean => {
    return dateStr === selectedRange.end
  }

  const isMiddleDate = (dateStr: string): boolean => {
    if (!selectedRange.start || !selectedRange.end) return false
    return dateStr > selectedRange.start && dateStr < selectedRange.end
  }

  const isFutureDate = (dateStr: string): boolean => {
    const today = new Date()
    const date = new Date(dateStr)

    // Reset time to 00:00:00 for comparison
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    return date > today
  }

  const handleDateClick = (dateStr: string) => {
    // Prevent selection of future dates
    if (isFutureDate(dateStr)) {
      return
    }

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
        const isStart = isStartDate(dateStr)
        const isEnd = isEndDate(dateStr)
        const isMiddle = isMiddleDate(dateStr)
        const isFuture = isFutureDate(dateStr)

        days.push(
          <button
            key={dateStr}
            onClick={() => isCurrentMonth && !isFuture && handleDateClick(dateStr)}
            disabled={!isCurrentMonth || isFuture}
            className={`
              w-full h-8 text-sm flex items-center justify-center transition-colors duration-150 relative
              ${!isCurrentMonth
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : isFuture
                ? 'text-muted-foreground/40 cursor-not-allowed opacity-50'
                : 'text-foreground cursor-pointer'
              }
              ${isToday && isCurrentMonth && !isFuture ? 'ring-2 ring-primary ring-inset z-10' : ''}
              ${isSelected && !isFuture ? 'bg-primary text-primary-foreground hover:bg-primary/80 hover:text-white font-bold z-10' : ''}
              ${isMiddle && !isFuture ? 'bg-primary/20 dark:bg-primary/30 font-semibold hover:bg-primary/30 dark:hover:bg-primary/40' : ''}
              ${isStart ? 'rounded-l-md' : ''}
              ${isEnd ? 'rounded-r-md' : ''}
              ${!isFuture && isCurrentMonth && !isInRange && !isSelected ? 'hover:bg-slate-50 dark:hover:bg-slate-800' : ''}
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
    <div className="flex gap-3">
      {/* Quick Select Buttons */}
      <div className="flex flex-col gap-2 min-w-[150px]">
        <span className="text-sm font-medium">Quick Select</span>
        {[
          { label: 'Past 2 days', value: 2 },
          { label: 'Past 7 days', value: 7 },
          { label: 'Past 30 days', value: 30 },
          { label: 'Past 60 days', value: 60 },
          { label: 'Past 90 days', value: 90 }
        ].map(({ label, value }) => {
          const today = new Date()
          let calculatedStartDate: Date

          // Use exact same logic as main page getDateRange() function
          switch (value) {
            case 2:
              calculatedStartDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
              break
            case 7:
              calculatedStartDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
              break
            case 30:
              calculatedStartDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
              break
            case 60:
              calculatedStartDate = new Date(today.getTime() - 59 * 24 * 60 * 60 * 1000)
              break
            case 90:
              calculatedStartDate = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000)
              break
            default:
              calculatedStartDate = new Date(today.getTime() - (value - 1) * 24 * 60 * 60 * 1000)
          }

          const calculatedStartDateStr = calculatedStartDate.toISOString().split('T')[0]
          const todayStr = today.toISOString().split('T')[0]
          const isActive = customStartDate === calculatedStartDateStr && customEndDate === todayStr

          return (
            <button
              key={value}
              onClick={() => {
                setCustomStartDate(calculatedStartDateStr)
                setCustomEndDate(todayStr)
                onRangeChange(calculatedStartDateStr, todayStr)
              }}
              className={`text-left text-sm px-2 py-1 rounded ${
                isActive
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Navigation and Current Month */}
      <div className="min-w-[230px]">
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
      <div className="min-w-[230px]">
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