export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0e11] text-[#f1eee8]">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#d6bc87] border-t-transparent"></div>
        <p className="mt-4 text-lg">Chargement de LOOLYYB...</p>
      </div>
    </div>
  )
}
