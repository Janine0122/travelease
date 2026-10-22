import { useState, useRef } from 'react'
import Place_map from './Place_map'
import Save_trip_button from './Save_trip_button'

const QUICK_PLACES = ['Tokyo', 'Paris', 'Bohol', 'Singapore', 'Seoul']

// public Overpass servers (the second one is a backup)
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

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

// gets data from an API, returns null if it fails or takes too long
async function get_json(url, wait = 6000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(wait) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// gets the description and photo from Wikipedia
async function get_wiki(title) {
  const data = await get_json(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=4&piprop=thumbnail&pithumbsize=500&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`
  )

  if (!data || !data.query) return null

  const page = Object.values(data.query.pages)[0]
  if (page.missing !== undefined || !page.extract) return null

  return {
    extract: page.extract,
    image: page.thumbnail ? page.thumbnail.source : null,
  }
}

// gets earthquakes (magnitude 4+) within 300 km in the past year
async function get_earthquakes(lat, lon) {
  const one_year_ago = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const data = await get_json(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=300&minmagnitude=4&starttime=${one_year_ago}&orderby=time&limit=5`
  )

  if (!data) return null
  return data.features
}

// gets places to visit within 10 km (OpenStreetMap Overpass API)
async function get_attractions(lat, lon) {
  const overpass_query = `[out:json][timeout:25];nwr["tourism"~"attraction|museum|viewpoint|zoo|theme_park"]["name"](around:10000,${lat},${lon});out center 60;`

  // try each server until one answers
  let data = null
  for (const server of OVERPASS_SERVERS) {
    data = await get_json(`${server}?data=${encodeURIComponent(overpass_query)}`, 20000)
    if (data) break
  }

  if (!data) return null

  const list = data.elements.map((item) => ({
    id: item.type + item.id,
    name: item.tags.name,
    type: item.tags.tourism,
    lat: item.lat || item.center.lat,
    lon: item.lon || item.center.lon,
    famous: Boolean(item.tags.wikipedia || item.tags.wikidata),
  }))

  // famous places first
  list.sort((a, b) => Number(b.famous) - Number(a.famous))

  // remove repeated names
  const seen = {}
  const unique = list.filter((place) => {
    if (seen[place.name]) return false
    seen[place.name] = true
    return true
  })

  return unique.slice(0, 8)
}

const HOME_CURRENCY = 'PHP'

function Home_page({ profile }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [places, setPlaces] = useState(null)
  const [places_loading, setPlacesLoading] = useState(false)
  const search_id = useRef(0)

  // when the search form is submitted
  function handle_search(e) {
    e.preventDefault()
    run_search(query)
  }

  // when a quick button is clicked
  function handle_quick(place_name) {
    setQuery(place_name)
    run_search(place_name)
  }

  async function run_search(search_text) {
    search_id.current = search_id.current + 1
    const this_search = search_id.current

    setMessage('')
    setResult(null)
    setPlaces(null)
    setPlacesLoading(false)
    setLoading(true)

    // API 1: OpenStreetMap Nominatim (find the place)
    const found = await get_json(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search_text)}&format=json&limit=1&addressdetails=1`
    )

    if (!found || found.length === 0) {
      setMessage('Place not found. Try another name.')
      setLoading(false)
      return
    }

    const place = found[0]
    const lat = parseFloat(place.lat)
    const lon = parseFloat(place.lon)
    const country_code = place.address.country_code
    const place_name = place.name || search_text

    // API 2: Open-Meteo (weather)
    // API 3: countries.dev (country info)
    // API 4 (bonus): Wikipedia (description and photo)
    // API 5: USGS (earthquakes)
    const [weather, country, wiki, quakes] = await Promise.all([
      get_json(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
      ),
      get_json(`https://countries.dev/alpha/${country_code}`),
      get_wiki(place_name),
      get_earthquakes(lat, lon),
    ])

    // API 6: Frankfurter (exchange rate from PHP to the local currency)
    let currency_code = null
    let rate = null

    if (country && country.currencies && country.currencies.length > 0) {
      currency_code = country.currencies[0].code

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

    // stop if the user already searched something else
    if (this_search !== search_id.current) return

    setResult({
      name: place_name,
      full_name: place.display_name,
      lat: lat,
      lon: lon,
      weather: weather,
      country: country,
      wiki: wiki,
      quakes: quakes,
      currency_code: currency_code,
      rate: rate,
    })
    setLoading(false)

    // API 7: Overpass (places to visit), loads after the main results
    setPlacesLoading(true)
    get_attractions(lat, lon).then((list) => {
      if (this_search !== search_id.current) return
      setPlaces(list)
      setPlacesLoading(false)
    })
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

      <div className="quick_row">
        <span className="small_text">Try:</span>
        {QUICK_PLACES.map((name) => (
          <button
            type="button"
            className="quick_btn"
            key={name}
            onClick={() => handle_quick(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <p className="loading">Searching...</p>}
      {message && <p className="error_text">{message}</p>}

      {!result && !loading && !message && (
        <div className="empty_state">
          <h3>Plan your next trip with TripMate</h3>
          <p>Search any place and get everything you need in one page:</p>
          <div className="feature_row">
            <span className="feature_tag">Weather forecast</span>
            <span className="feature_tag">Country info</span>
            <span className="feature_tag">Exchange rate</span>
            <span className="feature_tag">Earthquake alerts</span>
            <span className="feature_tag">Places to visit</span>
            <span className="feature_tag">Map</span>
          </div>
          <p>Then save the place to My Trips and add your dates and notes.</p>
        </div>
      )}

      {result && (
        <div className="results">
          <div className="card">
            <h3>{result.name}</h3>
            <p className="small_text">{result.full_name}</p>
            {result.wiki && result.wiki.image && (
              <img className="place_photo" src={result.wiki.image} alt={result.name} />
            )}
            <p>{result.wiki ? result.wiki.extract : 'No description found.'}</p>
            <Save_trip_button
              place={result.name}
              country={result.country ? result.country.name : ''}
            />
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
            <h3>Places to Visit</h3>
            <p className="small_text">Popular spots within 10 km (well-known places first)</p>
            {places_loading && <p>Looking for places...</p>}
            {!places_loading && places === null && (
              <p>Places not available right now. Try searching again later.</p>
            )}
            {places && places.length === 0 && <p>No attractions found nearby.</p>}
            {places &&
              places.map((spot) => (
                <div className="attraction" key={spot.id}>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lon}#map=17/${spot.lat}/${spot.lon}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {spot.name}
                  </a>
                  <span className="badge">{spot.type.replace('_', ' ')}</span>
                </div>
              ))}
          </div>

          <div className="card">
            <h3>Country</h3>
            {result.country ? (
              <>
                <img className="flag" src={result.country.flags.png} alt="flag" />
                <p>Name: {result.country.name}</p>
                <p>Capital: {result.country.capital || 'N/A'}</p>
                <p>Region: {result.country.region}</p>
                <p>Population: {result.country.population.toLocaleString()}</p>
                <p>
                  Languages:{' '}
                  {result.country.languages && result.country.languages.length > 0
                    ? result.country.languages.map((lang) => lang.name).join(', ')
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
            <h3>Recent Earthquakes</h3>
            <p className="small_text">Magnitude 4+ within 300 km, past year</p>
            {result.quakes === null && <p>Earthquake data not available.</p>}
            {result.quakes && result.quakes.length === 0 && (
              <p>No earthquakes found nearby.</p>
            )}
            {result.quakes &&
              result.quakes.map((quake) => (
                <p key={quake.id}>
                  {new Date(quake.properties.time).toLocaleDateString()}: M
                  {quake.properties.mag} - {quake.properties.place}
                </p>
              ))}
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