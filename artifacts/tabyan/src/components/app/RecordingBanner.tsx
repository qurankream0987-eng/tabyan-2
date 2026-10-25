export default function RecordingBanner() {
  return (
    <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
      <div className="mt-3 flex items-center gap-2 rounded-full bg-red-600/85 text-white px-4 py-1.5 text-sm font-readex font-bold animate-rec-pulse shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-white" />
        جاري التسجيل
      </div>
    </div>
  );
}
