import { Skeleton } from "@/components/ui/skeleton"

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#191714] text-[#f1eee8]">
      <div className="container py-8 md:py-12 flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg mb-6 text-center">
          <Skeleton className="mx-auto mb-2 h-8 w-64 bg-[#494136]/60" />
          <Skeleton className="mx-auto h-4 w-80 bg-[#494136]/40" />
        </div>

        <div className="w-full max-w-lg">
          <Skeleton className="h-[600px] w-full rounded-lg bg-[#494136]/40" />
        </div>
      </div>
    </div>
  )
}
