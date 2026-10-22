import { useState, useEffect } from 'react'
import { supabase } from './supabase_client'

function Admin_page() {
  const [users, setUsers] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load_data() {
      const users_result = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      const trips_result = await supabase.from('trips').select('*')

      if (users_result.error || trips_result.error) {
        setMessage('Could not load the dashboard data.')
      } else {
        setUsers(users_result.data)
        setTrips(trips_result.data)
      }
      setLoading(false)
    }

    load_data()
  }, [])

  if (loading) {
    return <p className="loading">Loading...</p>
  }

  // count how many times each place was saved
  const place_counts = {}
  trips.forEach((trip) => {
    place_counts[trip.place] = (place_counts[trip.place] || 0) + 1
  })

  const top_places = Object.entries(place_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // count trips per user
  function trips_of(user_id) {
    return trips.filter((trip) => trip.user_id === user_id).length
  }

  const admin_count = users.filter((user) => user.role === 'admin').length

  return (
    <div className="page">
      <h2>Admin Dashboard</h2>
      {message && <p className="error_text">{message}</p>}

      <div className="stats">
        <div className="stat_box">
          <h3>{users.length}</h3>
          <p>Total users</p>
        </div>
        <div className="stat_box">
          <h3>{admin_count}</h3>
          <p>Admins</p>
        </div>
        <div className="stat_box">
          <h3>{trips.length}</h3>
          <p>Saved trips</p>
        </div>
      </div>

      <div className="card dash_section">
        <h3>Most saved places</h3>
        {top_places.length === 0 ? (
          <p>No trips saved yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Place</th>
                <th>Times saved</th>
              </tr>
            </thead>
            <tbody>
              {top_places.map(([place, count]) => (
                <tr key={place}>
                  <td>{place}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card dash_section">
        <h3>All users</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Trips</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{trips_of(user.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Admin_page