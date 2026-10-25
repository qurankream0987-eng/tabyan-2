/**
 * @license
 * Tabyan Smart Mushaf — Bookmarks Management Modal
 */

import React from 'react';
import { Bookmark, WordKey } from '../../quran/domain/types';
import { Bookmark as BookmarkIcon, Trash2, X } from 'lucide-react';

interface BookmarksModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly bookmarks: readonly Bookmark[];
  readonly onSelectBookmark: (key: WordKey) => void;
  readonly onDeleteBookmark: (id: string) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSelectBookmark,
  onDeleteBookmark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-md max-h-[80vh] flex flex-col bg-[#FAF6EE] dark:bg-[#1D1417] border border-[#C5A059]/40 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C5A059]/30">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="w-5 h-5 text-[#C5A059]" />
            <h3 className="text-base font-bold text-[#4A0E17] dark:text-[#E5C378]">فواصل القراءة المحفوظة</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B1D2F] dark:text-[#C5A059] hover:bg-[#F0EAE1] dark:hover:bg-[#25191D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {bookmarks.length > 0 ? (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#C5A059]/20 bg-white/70 dark:bg-[#25191D]/70 hover:border-[#C5A059] transition-colors"
              >
                <button
                  onClick={() => {
                    onSelectBookmark(bm.key);
                    onClose();
                  }}
                  className="flex-1 text-right"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#832238] dark:text-[#E5C378]">
                    <span>سورة {bm.surahName}</span>
                    <span className="text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans">الآية {bm.key.ayah}</span>
                  </div>
                  <p className="text-sm font-['Amiri',serif] text-[#2C1E22] dark:text-[#EAD8C7] truncate mt-1">
                    {bm.textPreview}
                  </p>
                </button>

                <button
                  onClick={() => onDeleteBookmark(bm.id)}
                  className="w-8 h-8 flex items-center justify-center text-[#6B1D2F]/60 hover:text-red-600 transition-colors mr-2"
                  title="حذف الفاصل"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-xs text-[#6B1D2F]/60 dark:text-[#C5A059]/60 font-sans">
              لا توجد فواصل محفوظة حالياً. يمكنك الضغط على أيقونة الفاصل في شريط القراءة لحفظ أي موضع.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
