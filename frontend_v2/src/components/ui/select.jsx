import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value)

  const handleSelect = (newValue) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setIsOpen(false)
  }

  return (
    <div className="relative" {...props}>
      {React.Children.map(children, child =>
        React.cloneElement(child, { 
          selectedValue, 
          onSelect: handleSelect, 
          isOpen, 
          setIsOpen 
        })
      )}
    </div>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, selectedValue, isOpen, setIsOpen, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    onClick={() => setIsOpen?.(!isOpen)}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </button>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, selectedValue }) => (
  <span className="block truncate">
    {selectedValue || placeholder}
  </span>
)

const SelectContent = React.forwardRef(({ className, children, isOpen, selectedValue, onSelect, ...props }, ref) => (
  isOpen ? (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 shadow-lg",
        className
      )}
      {...props}
    >
      {React.Children.map(children, child =>
        React.cloneElement(child, { selectedValue, onSelect })
      )}
    </div>
  ) : null
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, selectedValue, onSelect, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100",
      selectedValue === value ? "bg-blue-50 text-blue-900" : "text-gray-900",
      className
    )}
    onClick={() => onSelect?.(value)}
    {...props}
  >
    {children}
  </div>
))
SelectItem.displayName = "SelectItem"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("py-1.5 pl-3 pr-2 text-sm font-semibold text-gray-900", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("my-1 h-px bg-gray-200", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}
