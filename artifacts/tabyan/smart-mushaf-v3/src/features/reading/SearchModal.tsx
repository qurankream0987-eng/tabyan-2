/**
 * @license
 * Tabyan Smart Mushaf — Quran Search Modal
 */

import React, { useState, useEffect } from 'react';
import { QuranContentProvider, SearchResult } from '../../quran/providers/QuranContentProvider';
import { WordKey } from '../../quran/domain/types';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly quranProvider: QuranContentProvider;
  readonly onSelectResult: (key: WordKey) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  quranProvider,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await quranProvider.search(query, 25);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, quranProvider]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col bg-[#FAF6EE] dark:bg-[#1D1417] border border-[#C5A059]/40 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Search Input */}
        <div className="p-4 border-b border-[#C5A059]/30 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              placeholder="ابحث بالكلمة أو الآية في القرآن الكريم..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 text-sm bg-white dark:bg-[#25191D] border border-[#C5A059]/30 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#C5A059] text-[#2C1E22] dark:text-[#EAD8C7]"
            />
            <Search className="absolute right-3 top-3 w-4 h-4 text-[#C5A059]" />
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#6B1D2F]/70 dark:text-[#C5A059]/70">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs font-sans">جارٍ البحث في المصحف الشريف...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((res, index) => (
              <button
                key={`${res.surahNumber}:${res.ayahNumber}:${index}`}
                onClick={() => {
                  onSelectResult(res.key);
                  onClose();
                }}
                className="w-full p-3 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 hover:border-[#C5A059] text-right transition-colors block"
              >
                <div className="flex items-center justify-between mb-1.5 text-xs text-[#832238] dark:text-[#E5C378] font-bold">
                  <span>سورة {res.surahNameArabic}</span>
                  <span className="text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans">الآية {res.ayahNumber}</span>
                </div>
                <p className="text-base font-['Amiri',serif] leading-relaxed text-[#2C1E22] dark:text-[#EAD8C7]">
                  {res.textUthmani}
                </p>
              </button>
            ))
          ) : query.trim().length >= 2 ? (
            <div className="text-center py-12 text-xs text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans">
              لم يتم العثور على نتائج تطابق "{query}"
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans">
              اكتب كلمتين أو أكثر لبدء البحث الفوري
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
