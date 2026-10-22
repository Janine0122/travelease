import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase_client'

function Login_form() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handle_login(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="form_box">
      <h2>Login</h2>
      <form onSubmit={handle_login}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      {message && <p className="error_text">{message}</p>}
      <p>
        No account yet? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}

export default Login_form