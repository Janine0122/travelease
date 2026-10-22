function Home_page({ profile }) {
  return (
    <div className="page">
      <h2>Welcome, {profile.full_name}!</h2>
      <p>Your role: {profile.role}</p>
    </div>
  )
}

export default Home_page
