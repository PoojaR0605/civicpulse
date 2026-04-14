import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLORS = {
  pothole:      '#EF4444',
  garbage:      '#F59E0B',
  streetlight:  '#8B5CF6',
  sewage:       '#06B6D4',
  encroachment: '#EC4899',
  waterlogging: '#3B82F6',
  other:        '#6B7280',
};

export default function IssueMap({ issues }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8,
      border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
        fontWeight: 600, fontSize: 14,
      }}>
        Issue heatmap — Bengaluru
      </div>
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        style={{ height: 350, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        {issues.map(issue => (
          <CircleMarker
            key={issue.id}
            center={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
            radius={issue.sla_breached ? 10 : 6}
            fillColor={CATEGORY_COLORS[issue.category] || '#6B7280'}
            color={issue.sla_breached ? '#EF4444' : '#fff'}
            weight={issue.sla_breached ? 2 : 1}
            fillOpacity={0.8}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>{issue.category}</strong><br />
                {issue.title || 'No title'}<br />
                Status: {issue.status}<br />
                Ward: {issue.ward_name || '—'}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}