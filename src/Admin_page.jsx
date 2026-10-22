import { useState, useEffect } from 'react'
import { supabase } from './supabase_client'

function Admin_page({ user_id }) {
  const [users, setUsers] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function load_data() {
    const users_result = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    const trips_result = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })

    if (users_result.error || trips_result.error) {
      setMessage('Could not load the dashboard data.')
    } else {
      setUsers(users_result.data)
      setTrips(trips_result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    load_data()
  }, [])

  // change a user's role
  async function change_role(user, new_role) {
    const sure = window.confirm(`Make ${user.full_name} a ${new_role}?`)
    if (!sure) return

    setMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: new_role })
      .eq('id', user.id)
      .select()

    if (error) {
      setMessage(error.message)
    } else if (data.length === 0) {
      setMessage('Not allowed. Did you run the SQL in Supabase?')
    } else {
      load_data()
    }
  }

  // remove any user's trip
  async function delete_trip(trip) {
    const sure = window.confirm(`Delete the trip "${trip.place}"?`)
    if (!sure) return

    setMessage('')

    const { data, error } = await supabase
      .from('trips')
      .delete()
      .eq('id', trip.id)
      .select()

    if (error) {
      setMessage(error.message)
    } else if (data.length === 0) {
      setMessage('Not allowed. Did you run the SQL in Supabase?')
    } else {
      load_data()
    }
  }

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

  function trips_of(id) {
    return trips.filter((trip) => trip.user_id === id).length
  }

  function owner_name(id) {
    const owner = users.find((user) => user.id === id)
    return owner ? owner.full_name : 'Unknown'
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
        <h3>Manage users</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Trips</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={user.role === 'admin' ? 'badge badge_admin' : 'badge'}>
                    {user.role}
                  </span>
                </td>
                <td>{trips_of(user.id)}</td>
                <td>
                  {user.id === user_id ? (
                    <span className="small_text">You</span>
                  ) : user.role === 'admin' ? (
                    <button className="table_btn" onClick={() => change_role(user, 'user')}>
                      Make user
                    </button>
                  ) : (
                    <button className="table_btn" onClick={() => change_role(user, 'admin')}>
                      Make admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card dash_section">
        <h3>All trips</h3>
        {trips.length === 0 ? (
          <p>No trips saved yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Place</th>
                <th>Country</th>
                <th>Saved by</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td>{trip.place}</td>
                  <td>{trip.country}</td>
                  <td>{owner_name(trip.user_id)}</td>
                  <td>
                    <button className="table_btn danger" onClick={() => delete_trip(trip)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Admin_page