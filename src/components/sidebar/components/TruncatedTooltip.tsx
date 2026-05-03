import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TruncatedTooltipProps {
  children: React.ReactElement
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
}

export function TruncatedTooltip({ children, content, side = "right", sideOffset = 10 }: TruncatedTooltipProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      const element = triggerRef.current
      if (element) {
        const isTruncated = element.scrollWidth > element.offsetWidth
        if (isTruncated) {
          setOpen(true)
        }
      }
    } else {
      setOpen(false)
    }
  }

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange}>
      <TooltipTrigger render={React.cloneElement(children as React.ReactElement<any>, { ref: triggerRef })} />
      <TooltipContent side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
