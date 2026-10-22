import { useState } from 'react'
import Place_map from './Place_map'

// turns the weather code into words
function weather_text(code) {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorm'
}

// gets data from an API, returns null if it fails
async function get_json(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

const HOME_CURRENCY = 'PHP'

function Home_page({ profile }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  async function handle_search(e) {
    e.preventDefault()
    setMessage('')
    setResult(null)
    setLoading(true)

    // API 1: OpenStreetMap Nominatim (find the place)
    const places = await get_json(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`
    )

    if (!places || places.length === 0) {
      setMessage('Place not found. Try another name.')
      setLoading(false)
      return
    }

    const place = places[0]
    const lat = parseFloat(place.lat)
    const lon = parseFloat(place.lon)
    const country_code = place.address.country_code
    const place_name = place.name || query

    // API 2: Open-Meteo (weather)
    // API 3: REST Countries (country info)
    // API 4: Wikipedia (description and photo)
    const [weather, country, wiki] = await Promise.all([
      get_json(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
      ),
      get_json(
        `https://restcountries.com/v3.1/alpha/${country_code}?fields=name,capital,region,languages,currencies,flags,population`
      ),
      get_json(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place_name)}`
      ),
    ])

    // API 5: Frankfurter (exchange rate from PHP to the local currency)
    let currency_code = null
    let rate = null

    if (country && country.currencies) {
      currency_code = Object.keys(country.currencies)[0]

      if (currency_code === HOME_CURRENCY) {
        rate = 1
      } else {
        const money = await get_json(
          `https://api.frankfurter.dev/v1/latest?base=${HOME_CURRENCY}&symbols=${currency_code}`
        )
        if (money && money.rates) {
          rate = money.rates[currency_code]
        }
      }
    }

    setResult({
      name: place_name,
      full_name: place.display_name,
      lat: lat,
      lon: lon,
      weather: weather,
      country: country,
      wiki: wiki,
      currency_code: currency_code,
      rate: rate,
    })
    setLoading(false)
  }

  return (
    <div className="page">
      <h2>Welcome, {profile.full_name}!</h2>
      <p>Search a place you want to visit.</p>

      <form className="search_form" onSubmit={handle_search}>
        <input
          type="text"
          placeholder="Example: Tokyo, Paris, Bohol"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button type="submit">Search</button>
      </form>

      {loading && <p>Searching...</p>}
      {message && <p className="error_text">{message}</p>}

      {result && (
        <div className="results">
          <div className="card">
            <h3>{result.name}</h3>
            <p className="small_text">{result.full_name}</p>
            {result.wiki && result.wiki.thumbnail && (
              <img className="place_photo" src={result.wiki.thumbnail.source} alt={result.name} />
            )}
            <p>{result.wiki ? result.wiki.extract : 'No description found.'}</p>
          </div>

          <div className="card">
            <h3>Weather</h3>
            {result.weather ? (
              <>
                <p>
                  Now: {result.weather.current.temperature_2m}°C,{' '}
                  {weather_text(result.weather.current.weather_code)}
                </p>
                <p>Wind: {result.weather.current.wind_speed_10m} km/h</p>
                <h4>Next 5 days</h4>
                {result.weather.daily.time.map((day, i) => (
                  <p key={day}>
                    {day}: {result.weather.daily.temperature_2m_min[i]}° to{' '}
                    {result.weather.daily.temperature_2m_max[i]}°C,{' '}
                    {weather_text(result.weather.daily.weather_code[i])}
                  </p>
                ))}
              </>
            ) : (
              <p>Weather not available.</p>
            )}
          </div>

          <div className="card">
            <h3>Country</h3>
            {result.country ? (
              <>
                <img className="flag" src={result.country.flags.png} alt="flag" />
                <p>Name: {result.country.name.common}</p>
                <p>Capital: {result.country.capital ? result.country.capital[0] : 'N/A'}</p>
                <p>Region: {result.country.region}</p>
                <p>Population: {result.country.population.toLocaleString()}</p>
                <p>
                  Languages:{' '}
                  {result.country.languages
                    ? Object.values(result.country.languages).join(', ')
                    : 'N/A'}
                </p>
              </>
            ) : (
              <p>Country info not available.</p>
            )}
          </div>

          <div className="card">
            <h3>Currency</h3>
            {result.rate ? (
              <p>
                1 {HOME_CURRENCY} = {result.rate} {result.currency_code}
              </p>
            ) : (
              <p>Exchange rate not available for this country.</p>
            )}
          </div>

          <div className="card">
            <h3>Map</h3>
            <Place_map lat={result.lat} lon={result.lon} name={result.name} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Home_page