import { useState } from 'react'
import { supabase } from './supabase_client'

function Save_trip_button({ place, country }) {
  const [message, setMessage] = useState('')

  async function handle_save() {
    setMessage('')

    const { error } = await supabase.from('trips').insert({
      place: place,
      country: country,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Saved to My Trips!')
    }
  }

  return (
    <div>
      <button className="save_btn" onClick={handle_save}>
        Save to My Trips
      </button>
      {message && <p className="success_text">{message}</p>}
    </div>
  )
}

export default Save_trip_button