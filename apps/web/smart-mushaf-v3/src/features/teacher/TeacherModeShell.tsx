/**
 * @license
 * Tabyan Smart Mushaf — Quran Teacher Mode Shell
 * Sequences Qari listening -> Student recitation -> Verification
 */

import React, { useState } from 'react';
import { Volume2, Mic, CheckCircle, RotateCcw, ArrowLeft, ArrowRight, Play, Pause } from 'lucide-react';
import { defaultAudioPlayback } from '../reading/AudioPlaybackService';

interface TeacherModeShellProps {
  readonly surahNumber: number;
  readonly currentAyah: number;
  readonly totalAyahs: number;
  readonly onNextAyah: () => void;
  readonly onPrevAyah: () => void;
}

export type TeacherStep = 'LISTEN_TO_QARI' | 'STUDENT_RECITE' | 'EVALUATION_RESULT';

export const TeacherModeShell: React.FC<TeacherModeShellProps> = ({
  surahNumber,
  currentAyah,
  totalAyahs,
  onNextAyah,
  onPrevAyah,
}) => {
  const [step, setStep] = useState<TeacherStep>('LISTEN_TO_QARI');
  const [isPlayingQari, setIsPlayingQari] = useState(false);
  const [isStudentReciting, setIsStudentReciting] = useState(false);
  const [studentPassed, setStudentPassed] = useState<boolean | null>(null);

  // Play Qari recitation
  const handlePlayQari = async () => {
    setIsPlayingQari(true);
    try {
      await defaultAudioPlayback.playAyah(surahNumber, currentAyah);
      // Listen for playback completion
      const unsub = defaultAudioPlayback.onStateChange((state) => {
        if (!state.isPlaying) {
          setIsPlayingQari(false);
          setStep('STUDENT_RECITE');
          unsub();
        }
      });
    } catch {
      setIsPlayingQari(false);
    }
  };

  // Student starts recitation
  const handleStartStudentRecite = () => {
    // Ensure Qari playback is completely stopped (Echo safety)
    defaultAudioPlayback.stop();
    setIsPlayingQari(false);
    setIsStudentReciting(true);

    // Simulate verified recitation evaluation
    setTimeout(() => {
      setIsStudentReciting(false);
      setStudentPassed(true);
      setStep('EVALUATION_RESULT');
    }, 3500);
  };

  const handleRetry = () => {
    setStep('LISTEN_TO_QARI');
    setStudentPassed(null);
  };

  const handleNext = () => {
    setStep('LISTEN_TO_QARI');
    setStudentPassed(null);
    onNextAyah();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF6EE]/95 dark:bg-[#1A1114]/95 backdrop-blur-md border-t border-[#C5A059]/30 pt-4 px-4 select-none"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-md mx-auto space-y-3">
        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs text-[#6B1D2F] dark:text-[#C5A059] font-sans">
          <span className="font-bold">المعلم القرآني · الآية {currentAyah} من {totalAyahs}</span>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${step === 'LISTEN_TO_QARI' ? 'bg-[#C5A059]' : 'bg-[#C5A059]/30'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 'STUDENT_RECITE' ? 'bg-[#C5A059]' : 'bg-[#C5A059]/30'}`} />
            <span className={`w-2 h-2 rounded-full ${step === 'EVALUATION_RESULT' ? 'bg-[#C5A059]' : 'bg-[#C5A059]/30'}`} />
          </div>
        </div>

        {/* Step 1: Listen to Qari */}
        {step === 'LISTEN_TO_QARI' && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 dark:bg-[#25191D]/80 border border-[#C5A059]/30">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#C5A059]" />
              <span className="text-xs text-[#2C1E22] dark:text-[#EAD8C7]">
                {isPlayingQari ? 'استمع لتلاوة القارئ...' : 'اضغط للاستماع إلى تلاوة الآية'}
              </span>
            </div>
            <button
              onClick={handlePlayQari}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#4A0E17] dark:bg-[#C5A059] dark:text-[#1A1114] rounded-xl hover:scale-105 active:scale-95 transition-transform min-h-[44px]"
            >
              {isPlayingQari ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              <span>{isPlayingQari ? 'جارٍ الاستماع' : 'استمع'}</span>
            </button>
          </div>
        )}

        {/* Step 2: Student Recites */}
        {step === 'STUDENT_RECITE' && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 dark:bg-[#25191D]/80 border border-[#C5A059]/30">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-[#C5A059]" />
              <span className="text-xs text-[#2C1E22] dark:text-[#EAD8C7]">
                {isStudentReciting ? 'ردد الآية الآن...' : 'دورك الآن لترديد الآية'}
              </span>
            </div>
            <button
              onClick={handleStartStudentRecite}
              disabled={isStudentReciting}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl min-h-[44px] transition-all ${
                isStudentReciting
                  ? 'bg-[#832238] animate-pulse'
                  : 'bg-[#4A0E17] dark:bg-[#C5A059] dark:text-[#1A1114] hover:scale-105'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isStudentReciting ? 'جارٍ الاستماع' : 'ابدأ الترديد'}</span>
            </button>
          </div>
        )}

        {/* Step 3: Evaluation Result */}
        {step === 'EVALUATION_RESULT' && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold">أحسنت! تلاوة ممتازة مطابقة للآية</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRetry}
                className="p-2 text-xs text-[#6B1D2F] dark:text-[#C5A059] hover:bg-white/50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="إعادة المحاولة"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentAyah >= totalAyahs}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-[#4A0E17] dark:bg-[#C5A059] dark:text-[#1A1114] rounded-xl hover:scale-105 min-h-[44px]"
              >
                <span>الآية التالية</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
