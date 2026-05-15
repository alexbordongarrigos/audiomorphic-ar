import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface LiquidSelectProps {
  value: string;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
}

const LiquidSelect: React.FC<LiquidSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-4 flex items-center justify-between rounded-xl 
                   bg-black/40 border border-cyan-500/30 backdrop-blur-md
                   text-white hover:border-cyan-400 transition-all duration-300
                   shadow-[0_0_15px_rgba(0,255,255,0.05)]"
      >
        <span className="text-sm font-medium truncate">
          {selectedOption ? selectedOption.label : placeholder || 'Seleccionar...'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "circOut" }}
        >
          <ChevronDown size={18} className="text-cyan-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] w-full mt-1 p-1 rounded-xl
                       bg-[#0a0f14]/90 border border-cyan-500/40 backdrop-blur-xl
                       shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,255,0.1)]
                       overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm rounded-lg transition-colors
                             ${value === opt.value 
                               ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                               : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiquidSelect;
