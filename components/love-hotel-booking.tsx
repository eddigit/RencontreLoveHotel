const partnerBookingUrl = 'https://booking.lovehotel.io/'

export function LoveHotelBookingWidget() {
  return (
    <div className='space-y-3'>
      <iframe
        src={partnerBookingUrl}
        title='Réserver auprès du Love Hôtel'
        referrerPolicy='no-referrer'
        className='h-[600px] w-full rounded-lg border-0'
      />
      <a href={partnerBookingUrl} target='_blank' rel='noopener noreferrer'
        className='inline-block text-sm font-semibold text-[#e3bf80] underline'>
        Ouvrir la réservation sur le site du Love Hôtel
      </a>
    </div>
  )
}

export default LoveHotelBookingWidget
