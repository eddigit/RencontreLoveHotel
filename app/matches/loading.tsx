
export default function MatchesLoading() {
  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0 bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]">
      <div className="container py-8 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ff3b8b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Chargement de vos matchs...</p>
        </div>
      </div>
    </div>
  )
}
