/**
 * @license
 * Tabyan Smart Mushaf — Top Navigation Bar
 * Follows the 3-zone Top Bar Contract and thumb-zone ergonomics.
 */

import React from 'react';
import { MushafMode } from '../../smart/state/types';
import { BookOpen, Mic, CheckCircle2, GraduationCap, Compass, Moon, Sun, Settings2 } from 'lucide-react';

interface MushafNavBarProps {
  readonly currentMode: MushafMode;
  readonly onSelectMode: (mode: MushafMode) => void;
  readonly onOpenIndex: () => void;
  readonly onOpenSettings: () => void;
  readonly isDarkMode: boolean;
  readonly onToggleDarkMode: () => void;
  readonly surahName: string;
  readonly juzNumber: number;
}

export const MushafNavBar: React.FC<MushafNavBarProps> = ({
  currentMode,
  onSelectMode,
  onOpenIndex,
  onOpenSettings,
  isDarkMode,
  onToggleDarkMode,
  surahName,
  juzNumber,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF6EE]/92 dark:bg-[#1A1114]/92 backdrop-blur-md border-b border-[#C5A059]/20 transition-colors">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-11 sm:min-h-12 py-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 select-none">
        {/* Zone 1: Subtle Brand Mark */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-base sm:text-lg font-bold font-['Amiri_Quran',serif] text-[#4A0E17] dark:text-[#E5C378] tracking-tight whitespace-nowrap">
            تِبْيَان
          </span>
          <span className="text-[10px] text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans hidden md:inline">
            المُصْحَف الذَّكِيّ
          </span>
        </div>

        {/* Zone 2: Restrained Segmented Mode Navigation */}
        <nav className="flex min-w-0 max-w-full items-center gap-0.5 p-0.5 bg-[#EFE9DF] dark:bg-[#23171B] rounded-lg overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelectMode('READING')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[28px] ${
              currentMode === 'READING'
                ? 'bg-white dark:bg-[#342227] text-[#4A0E17] dark:text-[#E5C378] shadow-xs font-bold'
                : 'text-[#6B1D2F]/75 dark:text-[#EAD8C7]/70 hover:text-[#4A0E17]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>قِرَاءَة</span>
          </button>

          <button
            onClick={() => onSelectMode('TASMEE')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[28px] ${
              currentMode === 'TASMEE'
                ? 'bg-[#4A0E17] text-white dark:bg-[#C5A059] dark:text-[#1A1114] shadow-xs font-bold'
                : 'text-[#6B1D2F]/75 dark:text-[#EAD8C7]/70 hover:text-[#4A0E17]'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>تَسْمِيع</span>
          </button>

          <button
            onClick={() => onSelectMode('CORRECTION')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[28px] ${
              currentMode === 'CORRECTION'
                ? 'bg-white dark:bg-[#342227] text-[#4A0E17] dark:text-[#E5C378] shadow-xs font-bold'
                : 'text-[#6B1D2F]/75 dark:text-[#EAD8C7]/70 hover:text-[#4A0E17]'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>تَصْحِيح</span>
          </button>

          <button
            onClick={() => onSelectMode('TEACHER')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[28px] ${
              currentMode === 'TEACHER'
                ? 'bg-white dark:bg-[#342227] text-[#4A0E17] dark:text-[#E5C378] shadow-xs font-bold'
                : 'text-[#6B1D2F]/75 dark:text-[#EAD8C7]/70 hover:text-[#4A0E17]'
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            <span>المُعَلِّم</span>
          </button>
        </nav>

        {/* Zone 3: Navigation Trigger & Controls */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <button
            onClick={onOpenIndex}
            className="flex min-w-0 items-center gap-1 px-2 py-1 text-[11px] sm:text-xs font-medium text-[#4A0E17] dark:text-[#E5C378] bg-[#FAF6EE] dark:bg-[#25191D] border border-[#C5A059]/30 rounded-md hover:border-[#C5A059] transition-colors whitespace-nowrap min-h-[28px]"
            title="فهرس السور والأجزاء"
          >
            <Compass className="w-3 h-3 text-[#C5A059] shrink-0" />
            <span className="truncate max-w-[9rem]">{surahName}</span>
          </button>

          <button
            onClick={onToggleDarkMode}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#EFE9DF] dark:hover:bg-[#25191D] transition-colors"
            title={isDarkMode ? 'الوضع المضيء' : 'الوضع الليلي'}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#EFE9DF] dark:hover:bg-[#25191D] transition-colors"
            title="إعدادات الخط والمصحف"
            aria-label="Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
