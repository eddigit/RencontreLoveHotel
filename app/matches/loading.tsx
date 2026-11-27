
export default function MatchesLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#191714] pb-16 text-[#f1eee8] md:pb-0">
      <div className="container py-8 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[#d6bc87] border-t-transparent"></div>
          <p>Chargement de vos matchs...</p>
        </div>
      </div>
    </div>
  )
}
