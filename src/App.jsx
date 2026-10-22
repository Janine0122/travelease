import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase_client'
import Navbar from './Navbar'
import Login_form from './Login_form'
import Register_form from './Register_form'
import Home_page from './Home_page'
import Admin_page from './Admin_page'
import './App.css'

function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  // check if someone is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data } = supabase.auth.onAuthStateChange((_event, new_session) => {
      setSession(new_session)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  // get the role of the logged in user
  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data ?? { role: 'user' }))
  }, [session])

  if (session === undefined || (session && !profile)) {
    return <p className="loading">Loading...</p>
  }

  const role = profile?.role

  return (
    <>
      <Navbar session={session} role={role} />
      <Routes>
        <Route
          path="/"
          element={session ? <Home_page profile={profile} /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!session ? <Login_form /> : <Navigate to="/" />}
        />
        <Route
          path="/register"
          element={!session ? <Register_form /> : <Navigate to="/" />}
        />
        <Route
          path="/admin"
          element={role === 'admin' ? <Admin_page /> : <Navigate to="/" />}
        />
      </Routes>
    </>
  )
}

export default App