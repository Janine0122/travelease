import { Link } from 'react-router-dom'
import { supabase } from './supabase_client'

function Navbar({ session, role }) {
  async function handle_logout() {
    await supabase.auth.signOut()
  }

  return (
    <nav className="navbar">
      <h2 className="logo">TripMate</h2>
      <div className="nav_links">
        {session ? (
          <>
            <Link to="/">Home</Link>
            <Link to="/trips">My Trips</Link>
            {role === 'admin' && <Link to="/admin">Dashboard</Link>}
            <button onClick={handle_logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar