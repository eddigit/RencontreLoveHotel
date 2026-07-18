'use client'

import { useEffect, useRef, useState } from 'react'

const bookingDocument = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://booking.lovehotel.io/assets/index.css" />
    <style>
      html, body { margin: 0; background: #f8f8fc; overflow: hidden; }
      #lovehotel-booking { max-width: none; padding: 20px; }
      @media (max-width: 640px) {
        #lovehotel-booking { padding: 12px; font-size: 16px; }
      }
    </style>
  </head>
  <body>
    <div id="lovehotel-booking"></div>
    <script>
      (function () {
        function reportHeight () {
          var booking = document.getElementById('lovehotel-booking');
          var nextHeight = booking ? Math.max(booking.offsetHeight, booking.scrollHeight) : 0;
          window.parent.postMessage({ type: 'lovehotel-booking-height', height: nextHeight }, '*');
        }
        new ResizeObserver(reportHeight).observe(document.body);
        window.addEventListener('load', reportHeight);
        window.setInterval(reportHeight, 1000);
      }());
    </script>
    <script type="module" src="https://booking.lovehotel.io/assets/index.js"></script>
  </body>
</html>`

export function LoveHotelBookingWidget () {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [height, setHeight] = useState(480)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'lovehotel-booking-height') return
      if (event.source !== iframeRef.current?.contentWindow) return
      const contentHeight = Number(event.data.height)
      if (!Number.isFinite(contentHeight)) return
      setHeight(Math.max(460, Math.min(2400, contentHeight + 16)))
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className='relative min-h-[460px] bg-[#f8f8fc]'>
      {!loaded && (
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-[#f8f8fc] text-sm font-semibold text-[#5a0b31]'>
          Chargement des disponibilités...
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={bookingDocument}
        onLoad={() => setLoaded(true)}
        style={{ height }}
        className='block w-full border-0 bg-[#f8f8fc] transition-[height] duration-300'
        sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation'
        referrerPolicy='strict-origin-when-cross-origin'
        title='Réservation officielle Love Hotel'
      />
    </div>
  )
}

export default LoveHotelBookingWidget
