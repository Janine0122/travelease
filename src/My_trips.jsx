import { useState, useEffect } from 'react'
import { supabase } from './supabase_client'

function My_trips({ user_id }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing_id, setEditingId] = useState(null)
  const [start_date, setStartDate] = useState('')
  const [end_date, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')

  // READ: get my trips
  async function load_trips() {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setTrips(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    load_trips()
  }, [])

  // open the edit form
  function start_edit(trip) {
    setEditingId(trip.id)
    setStartDate(trip.start_date || '')
    setEndDate(trip.end_date || '')
    setNotes(trip.notes || '')
    setMessage('')
  }

  // UPDATE: save the changes
  async function handle_update(e) {
    e.preventDefault()
    setMessage('')

    if (start_date && end_date && end_date < start_date) {
      setMessage('End date cannot be before the start date.')
      return
    }

    const { error } = await supabase
      .from('trips')
      .update({
        start_date: start_date || null,
        end_date: end_date || null,
        notes: notes,
      })
      .eq('id', editing_id)

    if (error) {
      setMessage(error.message)
    } else {
      setEditingId(null)
      load_trips()
    }
  }

  // DELETE: remove a trip
  async function handle_delete(id) {
    const sure = window.confirm('Delete this trip?')
    if (!sure) return

    const { error } = await supabase.from('trips').delete().eq('id', id)

    if (error) {
      setMessage(error.message)
    } else {
      load_trips()
    }
  }

  if (loading) {
    return <p className="loading">Loading...</p>
  }

  return (
    <div className="page">
      <h2>My Trips</h2>
      {message && <p className="error_text">{message}</p>}

      {trips.length === 0 && (
        <p>No trips yet. Search a place on the Home page and click "Save to My Trips".</p>
      )}

      <div className="results">
        {trips.map((trip) => (
          <div className="card" key={trip.id}>
            <h3>{trip.place}</h3>
            <p className="small_text">{trip.country}</p>

            {editing_id === trip.id ? (
              <form className="edit_form" onSubmit={handle_update}>
                <label>Start date</label>
                <input
                  type="date"
                  value={start_date}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <label>End date</label>
                <input
                  type="date"
                  value={end_date}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <label>Notes</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="trip_buttons">
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>Start: {trip.start_date || 'Not set'}</p>
                <p>End: {trip.end_date || 'Not set'}</p>
                <p>Notes: {trip.notes || 'None'}</p>
                <div className="trip_buttons">
                  <button onClick={() => start_edit(trip)}>Edit</button>
                  <button className="delete_btn" onClick={() => handle_delete(trip.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default My_trips