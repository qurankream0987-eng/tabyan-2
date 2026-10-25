/**
 * @license
 * Tabyan Smart Mushaf — Reading Mode Controls Bar
 */

import React from 'react';
import { ChevronRight, ChevronLeft, Play, Pause, Search, Bookmark, BookmarkCheck } from 'lucide-react';

interface ReadingControlsProps {
  readonly onPrevSurah: () => void;
  readonly onNextSurah: () => void;
  readonly onToggleAudio: () => void;
  readonly isAudioPlaying: boolean;
  readonly onOpenSearch: () => void;
  readonly onOpenBookmarks: () => void;
  readonly isBookmarked: boolean;
  readonly onToggleBookmark: () => void;
  readonly surahNumber: number;
  readonly ayahNumber: number;
}

export const ReadingControls: React.FC<ReadingControlsProps> = ({
  onPrevSurah,
  onNextSurah,
  onToggleAudio,
  isAudioPlaying,
  onOpenSearch,
  onOpenBookmarks,
  isBookmarked,
  onToggleBookmark,
  surahNumber,
  ayahNumber,
}) => {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#FAF6EE]/95 dark:bg-[#1A1114]/95 backdrop-blur-md border-t border-[#C5A059]/30 pt-2.5 px-4 select-none"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Previous Surah Button */}
        <button
          onClick={onPrevSurah}
          disabled={surahNumber <= 1}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl text-[#4A0E17] dark:text-[#E5C378] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[44px]"
          title="السورة السابقة"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="hidden sm:inline">السابقة</span>
        </button>

        {/* Action cluster */}
        <div className="flex items-center gap-2">
          {/* Audio Playback Toggle */}
          <button
            onClick={onToggleAudio}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all min-h-[44px] min-w-[44px] shadow-sm ${
              isAudioPlaying
                ? 'bg-[#832238] text-white dark:bg-[#C5A059] dark:text-[#1A1114] ring-2 ring-[#C5A059]/50 animate-pulse'
                : 'bg-[#4A0E17] text-white dark:bg-[#C5A059] dark:text-[#1A1114] hover:scale-105 active:scale-95'
            }`}
            title={isAudioPlaying ? 'إيقاف التلاوة' : 'استماع لتلاوة الآية'}
          >
            {isAudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] transition-colors min-h-[44px] min-w-[44px]"
            title="بحث في القرآن الكريم"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Bookmark Trigger */}
          <button
            onClick={onToggleBookmark}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] transition-colors min-h-[44px] min-w-[44px]"
            title={isBookmarked ? 'إزالة الفاصل' : 'حفظ موضع القراءة'}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-[#832238] dark:text-[#E5C378]" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* Bookmarks List Trigger */}
          <button
            onClick={onOpenBookmarks}
            className="px-2.5 py-1.5 text-xs text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] rounded-lg transition-colors min-h-[44px] flex items-center"
            title="عرض الفواصل المحفوظة"
          >
            الفواصل
          </button>
        </div>

        {/* Next Surah Button */}
        <button
          onClick={onNextSurah}
          disabled={surahNumber >= 114}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl text-[#4A0E17] dark:text-[#E5C378] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[44px]"
          title="السورة التالية"
        >
          <span className="hidden sm:inline">التالية</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
