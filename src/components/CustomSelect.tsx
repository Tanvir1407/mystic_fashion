"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { ChevronDown, Search, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
  value: string;
  label: string;
  colorClass?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  openUpwards?: boolean;
  heightClass?: string;
  textClass?: string;
  onSearchValueChange?: (value: string) => void;
  isLoading?: boolean;
}

export interface CustomSelectRef {
  focusAndOpen: () => void;
}

export const CustomSelect = forwardRef<CustomSelectRef, CustomSelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select option",
      label,
      searchable = false,
      className = "",
      disabled = false,
      openUpwards = false,
      heightClass = "h-12",
      textClass = "text-sm",
      onSearchValueChange,
      isLoading = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const optionsListRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      focusAndOpen() {
        buttonRef.current?.focus();
        if (!disabled) {
          setIsOpen(true);
        }
      }
    }));

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset active index when search or open state changes
    useEffect(() => {
      setActiveIndex(0);
    }, [search, isOpen]);

    // Auto-scroll to active item
    useEffect(() => {
      if (isOpen && activeIndex >= 0 && optionsListRef.current) {
        const activeElement = optionsListRef.current.children[activeIndex] as HTMLElement;
        if (activeElement) {
          activeElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [activeIndex, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          if (!disabled) setIsOpen(true);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions.length > 0 && activeIndex >= 0 && activeIndex < filteredOptions.length) {
          onChange(filteredOptions[activeIndex].value);
          setIsOpen(false);
          setSearch("");
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    return (
      <div
        className={`relative ${className}`}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        {label && (
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            {label}
          </label>
        )}

        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full ${heightClass} flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 ${textClass} transition-all focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${selectedOption?.colorClass || "text-slate-900"}`}
        >
          <span className={`truncate font-semibold ${selectedOption ? "text-slate-800" : "text-slate-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
              }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: openUpwards ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: openUpwards ? 10 : -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute z-50 w-full bg-white border border-slate-200  shadow-xl overflow-hidden ring-1 ring-black/5 ${openUpwards ? "bottom-full mb-2" : "top-full mt-2"
                }`}
            >
              {searchable && (
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearch(val);
                        onSearchValueChange?.(val);
                      }}
                      placeholder="Search..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div
                ref={optionsListRef}
                className="max-h-60 overflow-y-auto custom-scrollbar"
              >
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : filteredOptions.length > 0 ? (
                  filteredOptions.map((opt, index) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group ${value === opt.value
                        ? "bg-primary/5 text-primary font-bold"
                        : activeIndex === index
                          ? "bg-slate-100 text-slate-900"
                          : "hover:bg-slate-50 text-slate-700"
                        } ${opt.colorClass || ""}`}
                    >
                      <span>{opt.label}</span>
                      {value === opt.value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-xs text-slate-400 italic">
                    No options found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  });

CustomSelect.displayName = "CustomSelect";
