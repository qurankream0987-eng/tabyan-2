/**
 * @license
 * Tabyan Smart Mushaf — Navigation Index Modal (Surahs, Juz, Pages)
 */

import React, { useState } from 'react';
import { SURAH_METADATA } from '../../quran/data/surahMetadata';
import { JUZ_REFERENCES } from '../../quran/data/pages';
import { X, Search, Compass, BookMarked } from 'lucide-react';
import { normalizeArabicSimple } from '../../quran/domain/validation';

interface NavigationModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelectSurah: (surahNumber: number) => void;
  readonly onSelectJuz: (juzNumber: number) => void;
  readonly onSelectPage: (pageNumber: number) => void;
  readonly currentSurah: number;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  onSelectSurah,
  onSelectJuz,
  onSelectPage,
  currentSurah,
}) => {
  const [activeTab, setActiveTab] = useState<'SURAHS' | 'JUZ' | 'PAGES'>('SURAHS');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageInput, setPageInput] = useState('');

  if (!isOpen) return null;

  const normalizedQuery = normalizeArabicSimple(searchQuery);
  const filteredSurahs = SURAH_METADATA.filter(
    (s) =>
      s.nameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
      normalizeArabicSimple(s.nameArabic).includes(normalizedQuery) ||
      String(s.number).includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col bg-[#FAF6EE] dark:bg-[#1D1417] border border-[#C5A059]/40 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C5A059]/30">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#C5A059]" />
            <h3 className="text-base font-bold text-[#4A0E17] dark:text-[#E5C378]">فهرس المصحف الشريف</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-3 bg-[#F0EAE1]/70 dark:bg-[#25191D]/70 border-b border-[#C5A059]/20">
          <button
            onClick={() => setActiveTab('SURAHS')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'SURAHS'
                ? 'bg-white dark:bg-[#342227] text-[#4A0E17] dark:text-[#E5C378] shadow-xs'
                : 'text-[#6B1D2F]/70 dark:text-[#EAD8C7]/70'
            }`}
          >
            السور (١١٤)
          </button>
          <button
            onClick={() => setActiveTab('JUZ')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'JUZ'
                ? 'bg-white dark:bg-[#342227] text-[#4A0E17] dark:text-[#E5C378] shadow-xs'
                : 'text-[#6B1D2F]/70 dark:text-[#EAD8C7]/70'
            }`}
          >
            الأجزاء (٣٠)
          </button>
          <button
            onClick={() => setActiveTab('PAGES')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'PAGES'
                ? 'bg-white dark:bg-[#342227] text-[#4A0E17] dark:text-[#E5C378] shadow-xs'
                : 'text-[#6B1D2F]/70 dark:text-[#EAD8C7]/70'
            }`}
          >
            الصفحات (٦٠٤)
          </button>
        </div>

        {/* Search Input for Surahs */}
        {activeTab === 'SURAHS' && (
          <div className="p-3 border-b border-[#C5A059]/20">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن اسم السورة أو رقمها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-xs bg-white dark:bg-[#25191D] border border-[#C5A059]/30 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#C5A059] text-[#2C1E22] dark:text-[#EAD8C7]"
              />
              <Search className="absolute right-3 top-3 w-4 h-4 text-[#C5A059]" />
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'SURAHS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredSurahs.map((surah) => {
                const isSelected = surah.number === currentSurah;
                return (
                  <button
                    key={surah.number}
                    onClick={() => {
                      onSelectSurah(surah.number);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-right transition-colors ${
                      isSelected
                        ? 'border-[#C5A059] bg-[#C5A059]/15 dark:bg-[#C5A059]/20'
                        : 'border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 hover:border-[#C5A059]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FAF6EE] dark:bg-[#1D1417] text-xs font-bold text-[#4A0E17] dark:text-[#E5C378] border border-[#C5A059]/40">
                        {surah.number}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-[#4A0E17] dark:text-[#E5C378] font-['Amiri_Quran',serif]">
                          سورة {surah.nameArabic}
                        </h4>
                        <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-sans">
                          {surah.nameEnglish} · {surah.totalAyahs} آيات
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans">
                      ص {surah.startPage}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'JUZ' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {JUZ_REFERENCES.map((juz) => (
                <button
                  key={juz.juzNumber}
                  onClick={() => {
                    onSelectJuz(juz.juzNumber);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 hover:border-[#C5A059]/50 text-right transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FAF6EE] dark:bg-[#1D1417] text-xs font-bold text-[#4A0E17] dark:text-[#E5C378] border border-[#C5A059]/40">
                      {juz.juzNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#4A0E17] dark:text-[#E5C378]">
                        الجزء {juz.juzNumber}
                      </h4>
                      <span className="text-[11px] text-[#6B1D2F]/70 dark:text-[#C5A059]/70 font-['Amiri',serif]">
                        {juz.nameArabic}
                      </span>
                    </div>
                  </div>
                  <BookMarked className="w-4 h-4 text-[#C5A059]" />
                </button>
              ))}
            </div>
          )}

          {activeTab === 'PAGES' && (
            <div className="space-y-4 p-2 text-center">
              <p className="text-xs text-[#6B1D2F]/80 dark:text-[#C5A059]/80 font-sans">
                انتقل مباشرة إلى أي صفحة من صفحات المصحف الشريف (١ إلى ٦٠٤)
              </p>
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <input
                  type="number"
                  min="1"
                  max="604"
                  placeholder="رقم الصفحة..."
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="w-32 px-3 py-2 text-center text-sm bg-white dark:bg-[#25191D] border border-[#C5A059]/40 rounded-xl text-[#2C1E22] dark:text-[#EAD8C7]"
                />
                <button
                  onClick={() => {
                    const p = parseInt(pageInput, 10);
                    if (!isNaN(p) && p >= 1 && p <= 604) {
                      onSelectPage(p);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#4A0E17] dark:bg-[#C5A059] dark:text-[#1D1417] rounded-xl hover:opacity-90 transition-opacity"
                >
                  انتقال
                </button>
              </div>

              {/* Quick page anchors */}
              <div className="pt-4 border-t border-[#C5A059]/20">
                <span className="text-[11px] text-[#6B1D2F]/60 dark:text-[#C5A059]/60 block mb-2 font-sans">
                  صفحات شائعة:
                </span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {[1, 2, 50, 106, 293, 440, 562, 582, 604].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        onSelectPage(p);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs border border-[#C5A059]/30 rounded-lg bg-white/50 dark:bg-[#25191D]/50 hover:border-[#C5A059] text-[#4A0E17] dark:text-[#E5C378]"
                    >
                      ص {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
