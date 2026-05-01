"use client"

import * as React from "react"
import { addMonths, subMonths } from "date-fns"
import { Clock2Icon, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CalendarPickerProps {
  date?: string;
  allDay?: boolean;
  timeFrom?: string | null;
  timeTo?: string | null;
  onSelect: (attrs: any) => void;
  onDelete: () => void;
}

export function CalendarPicker({ 
  date, 
  allDay = true,
  timeFrom,
  timeTo,
  onSelect, 
  onDelete 
}: CalendarPickerProps) {
  const selectedDate = React.useMemo(() => {
    if (date) return new Date(date)
    return undefined
  }, [date])

  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    selectedDate || new Date()
  )

  const handleSelect = (val: Date | undefined) => {
    if (val) {
      onSelect({
        date: val.toISOString()
      })
    }
  }

  const handleMonthChange = (month: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(parseInt(month))
    setCurrentMonth(newMonth)
  }

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(parseInt(year))
    setCurrentMonth(newMonth)
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i)

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <Card size="sm" className="mx-auto w-fit">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-3 pb-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <Select
              value={months[currentMonth.getMonth()]}
              onValueChange={(val) => handleMonthChange(months.indexOf(val).toString())}
            >
              <SelectTrigger className="h-8 w-fit min-w-[100px] border-none bg-transparent hover:bg-accent font-semibold text-sm px-2 gap-1 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="h-8 w-fit border-none bg-transparent hover:bg-accent font-semibold text-sm px-2 gap-1 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-72">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="p-3"
        />
      </CardContent>
      {!allDay && (
        <CardFooter className="border-t bg-card p-4 pb-2">
          <FieldGroup className="w-full">
            <Field className="w-full">
              <FieldLabel htmlFor="time-picker">Time</FieldLabel>
              <InputGroup className="w-full">
                <InputGroupInput
                  id="time-picker"
                  type="time"
                  step="1"
                  value={timeFrom || "10:30:00"}
                  onChange={(e) => onSelect({ timeFrom: e.target.value })}
                  className="appearance-none w-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon>
                  <Clock2Icon className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        </CardFooter>
      )}

      <CardFooter className="flex items-center justify-between border-t p-4">
        <button 
          onClick={() => {
            if (allDay) {
              onSelect({ 
                allDay: false, 
                timeFrom: timeFrom || "10:30:00" 
              });
            } else {
              onSelect({ allDay: true });
            }
          }}
          className="flex items-center gap-2 group"
        >
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative ${allDay ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all ${allDay ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">All-day</span>
        </button>

        <Button 
          variant="ghost" 
          size="icon-xs" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete()}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
