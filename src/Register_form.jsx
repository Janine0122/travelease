import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase_client'

function Register_form() {
  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handle_register(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: full_name } },
    })

    if (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="form_box">
      <h2>Create Account</h2>
      <form onSubmit={handle_register}>
        <input
          type="text"
          placeholder="Full name"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit">Register</button>
      </form>
      {message && <p className="error_text">{message}</p>}
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

export default Register_form