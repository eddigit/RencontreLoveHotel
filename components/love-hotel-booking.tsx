"use client"

import { useEffect, useState } from "react"

export function LoveHotelBookingWidget() {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  useEffect(() => {
    // Charger les styles dans l'iframe
    const iframe = document.getElementById("lovehotel-iframe") as HTMLIFrameElement
    if (iframe && iframe.contentDocument) {
      const link = iframe.contentDocument.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://booking.lovehotel.io/assets/index.css"
      iframe.contentDocument.head.appendChild(link)

      // Créer le conteneur pour le widget
      const container = iframe.contentDocument.createElement("div")
      container.id = "lovehotel-booking"
      iframe.contentDocument.body.appendChild(container)

      // Charger le script
      const script = iframe.contentDocument.createElement("script")
      script.type = "module"
      script.src = "https://booking.lovehotel.io/assets/index.js"
      iframe.contentDocument.body.appendChild(script)
    }
  }, [iframeLoaded])

  return (
    <iframe
      id="lovehotel-iframe"
      className="w-full h-[600px] border-0 rounded-lg"
      onLoad={() => setIframeLoaded(true)}
      sandbox="allow-scripts allow-same-origin"
      title="Love Hotel Booking Widget"
    />
  )
}

export default LoveHotelBookingWidget
