import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, addDays, subDays } from 'date-fns';
import { CalendarPicker } from "../../CalendarPicker";

export const CalendarNode = Node.create({
  name: 'calendar',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      date: {
        default: null,
        parseHTML: element => element.getAttribute('data-date'),
        renderHTML: attributes => {
          if (!attributes.date) return {};
          return { 'data-date': attributes.date };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) return {};
          return { 'data-label': attributes.label };
        },
      },
      allDay: {
        default: true,
        parseHTML: element => element.getAttribute('data-all-day') === 'true',
        renderHTML: attributes => {
          return { 'data-all-day': attributes.allDay ? 'true' : 'false' };
        },
      },
      timeFrom: {
        default: null,
        parseHTML: element => element.getAttribute('data-time-from'),
        renderHTML: attributes => {
          if (!attributes.timeFrom) return {};
          return { 'data-time-from': attributes.timeFrom };
        },
      },
      timeTo: {
        default: null,
        parseHTML: element => element.getAttribute('data-time-to'),
        renderHTML: attributes => {
          if (!attributes.timeTo) return {};
          return { 'data-time-to': attributes.timeTo };
        },
      },
      autoOpen: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="calendar"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'calendar' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, deleteNode }) => {
      const { date, label, allDay, timeFrom, timeTo, autoOpen } = node.attrs;
      const [isOpen, setIsOpen] = React.useState(autoOpen || false);

      const displayDate = React.useMemo(() => {
        if (label) return label;
        if (!date) return 'Select date...';
        const dateStr = format(new Date(date), 'MMM d, yyyy');
        if (!allDay && timeFrom) {
          return `${dateStr} ${timeFrom.substring(0, 5)}${timeTo ? ` - ${timeTo.substring(0, 5)}` : ''}`;
        }
        return dateStr;
      }, [date, label, allDay, timeFrom, timeTo]);

      return (
        <NodeViewWrapper as="span" className="inline-block mx-0.5 align-middle leading-none">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <PopoverTrigger
                      render={
                        <span
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer select-none transition-colors hover:text-muted-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(true);
                          }}
                        >
                          {displayDate}
                        </span>
                      }
                    />
                  }
                />
                <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                  Edit date
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <PopoverContent 
              className="w-auto p-0 z-[10001] shadow-2xl border-border/50 flex flex-col bg-popover" 
              align="center"
              sideOffset={4}
            >
              <ScrollArea 
                className="flex-1 w-full"
                style={{ maxHeight: 'calc(var(--available-height, 85vh) - 16px)' }}
              >
                <CalendarPicker
                  date={date}
                  allDay={allDay}
                  timeFrom={timeFrom}
                  timeTo={timeTo}
                  onSelect={updateAttributes}
                  onDelete={deleteNode}
                />
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </NodeViewWrapper>
      );
    });
  },
});
