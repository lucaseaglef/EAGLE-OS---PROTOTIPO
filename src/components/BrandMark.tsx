import React from 'react';

export function EagleEmblem({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-[#163744] text-[#f2f4f7] shrink-0 shadow-xs ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[62%] h-[62%]"
      >
        {/* Três penas desenhando a letra E e fluindo até a cabeça da águia */}
        <path
          d="M5 7.5H20.5C23.5 7.5 26 9.1 27.5 11.4L24.4 11.8C25.3 12.6 25.9 13.7 26.2 14.9C23.6 13.6 20.6 13.2 17.6 13.2H9.2V14.4H18.4C19.6 14.4 20.5 15.3 20.5 16.5C20.5 17.7 19.6 18.6 18.4 18.6H9.2V20.3H16.8C18.1 20.3 19.1 21.3 19.1 22.6C19.1 23.9 18.1 24.8 16.8 24.8H5V7.5Z"
          fill="currentColor"
        />
        {/* Olho negativo sutil na cabeça da águia */}
        <circle cx="22.1" cy="10.2" r="0.95" fill="#163744" />
      </svg>
    </div>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <EagleEmblem className="w-8 h-8" />
      {!compact && (
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-[13px] font-semibold tracking-[0.22em] text-[#0f1115] dark:text-[#f2f4f7] uppercase">
            EAGLE
          </span>
          <span className="text-[13px] font-normal tracking-[0.04em] text-[#0f1115]/55 dark:text-[#f2f4f7]/55">
            OS
          </span>
        </div>
      )}
    </div>
  );
}
