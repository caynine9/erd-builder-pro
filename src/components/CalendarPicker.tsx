"use client"

import * as React from "react"
import { addDays, addMonths, subMonths, format, startOfMonth } from "date-fns"
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
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    date ? new Date(date) : new Date()
  )

  const selectedDate = React.useMemo(() => {
    if (date) return new Date(date)
    return undefined
  }, [date])

  const handleSelect = (val: Date | undefined) => {
    if (val) {
      onSelect({
        date: val.toISOString()
      })
    }
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const years = Array.from({ length: 201 }, (_, i) => 1900 + i)

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(parseInt(monthIndex))
    setCurrentMonth(newMonth)
  }

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(parseInt(year))
    setCurrentMonth(newMonth)
  }

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <Card className="mx-auto w-[320px] border-none shadow-none" size="sm">
      <div className="flex items-center pt-5 px-5 pb-2">
        <Button 
          variant="ghost" 
          size="icon-xs" 
          className="h-8 w-8 shrink-0 opacity-50 hover:opacity-100 hover:bg-accent"
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex-1 flex items-center justify-center gap-0.5">
          <Select
            value={months[currentMonth.getMonth()]}
            onValueChange={(val) => handleMonthChange(months.indexOf(val).toString())}
          >
            <SelectTrigger className="h-8 w-fit min-w-[80px] border-none bg-transparent hover:bg-accent font-semibold text-sm px-2 gap-1 shadow-none focus:ring-0">
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
          size="icon-xs" 
          className="h-8 w-8 shrink-0 opacity-50 hover:opacity-100 hover:bg-accent"
          onClick={goToNextMonth}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <CardContent className="px-5 py-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          fixedWeeks
        />
      </CardContent>
      
      {!allDay && (
        <CardFooter className="border-t bg-card/80 px-3 py-4">
          <FieldGroup className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="time-from">Start Time</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="time-from"
                  type="time"
                  step="1"
                  value={timeFrom || "10:30:00"}
                  onChange={(e) => onSelect({ timeFrom: e.target.value })}
                  className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon>
                  <Clock2Icon className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="time-to">End Time</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="time-to"
                  type="time"
                  step="1"
                  value={timeTo || "12:30:00"}
                  onChange={(e) => onSelect({ timeTo: e.target.value })}
                  className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <InputGroupAddon>
                  <Clock2Icon className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        </CardFooter>
      )}

      <CardFooter className="flex flex-wrap gap-2 border-t p-4 pb-2">
        {[
          { label: "Today", value: 0 },
          { label: "Tomorrow", value: 1 },
          { label: "In 3 days", value: 3 },
          { label: "In a week", value: 7 },
          { label: "In 2 weeks", value: 14 },
        ].map((preset) => (
          <Button
            key={preset.value}
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const newDate = addDays(new Date(), preset.value)
              onSelect({
                date: newDate.toISOString()
              })
              setCurrentMonth(
                new Date(newDate.getFullYear(), newDate.getMonth(), 1)
              )
            }}
          >
            {preset.label}
          </Button>
        ))}
      </CardFooter>

      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (allDay) {
                onSelect({ 
                  allDay: false, 
                  timeFrom: timeFrom || "10:30:00", 
                  timeTo: timeTo || "12:30:00" 
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
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">All-day</span>
          </button>
        </div>

        <Button 
          variant="ghost" 
          size="icon-xs" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
