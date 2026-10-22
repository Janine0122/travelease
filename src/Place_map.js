import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function Place_map({ lat, lon, name }) {
  return (
    <MapContainer key={`${lat}${lon}`} center={[lat, lon]} zoom={10} className="map_box">
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[lat, lon]} radius={10}>
        <Popup>{name}</Popup>
      </CircleMarker>
    </MapContainer>
  )
}

export default Place_map