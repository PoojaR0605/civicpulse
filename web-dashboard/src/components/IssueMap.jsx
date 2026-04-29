import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLORS = {
  pothole:'#EF4444', garbage:'#F59E0B', streetlight:'#8B5CF6',
  sewage:'#06B6D4', encroachment:'#EC4899', waterlogging:'#3B82F6', other:'#6B7280',
};
const CAT_ICONS = { pothole:'🕳️', garbage:'🗑️', streetlight:'💡', sewage:'🚰', encroachment:'🚧', waterlogging:'🌊', other:'📋' };

const STATUS_COLORS = {
  submitted:'#F59E0B', validated:'#3B82F6', assigned:'#8B5CF6',
  in_progress:'#06B6D4', resolved:'#10B981', rejected:'#EF4444',
};

// Auto-fit map to show all markers
function FitBounds({ issues }) {
  const map = useMap();
  useEffect(() => {
    if (issues.length === 0) return;
    const valid = issues.filter(i => i.latitude && i.longitude);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([parseFloat(valid[0].latitude), parseFloat(valid[0].longitude)], 15);
      return;
    }
    const lats = valid.map(i => parseFloat(i.latitude));
    const lngs = valid.map(i => parseFloat(i.longitude));
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding:[40,40] });
  }, [issues, map]);
  return null;
}

export default function IssueMap({ issues }) {
  const activeCategories = [...new Set(issues.map(i => i.category).filter(Boolean))];
  const validIssues = issues.filter(i => i.latitude && i.longitude);

  return (
    <div style={{ background:'#fff', borderRadius:8, border:'1px solid #e5e7eb', overflow:'hidden', marginBottom:24 }}>
      {/* Header with legend */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontWeight:600, fontSize:14 }}>🗺️ Issue Heatmap — Bengaluru</span>
          <span style={{ fontSize:12, color:'#6b7280' }}>{validIssues.length} issues plotted</span>
        </div>
        {/* Category legend */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {(activeCategories.length>0 ? activeCategories : Object.keys(CATEGORY_COLORS)).map(cat => (
            <div key={cat} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:CATEGORY_COLORS[cat]||'#6B7280' }} />
              <span style={{ color:'#6b7280' }}>{CAT_ICONS[cat]} {cat}</span>
            </div>
          ))}
        </div>
        {/* SLA legend */}
        <div style={{ display:'flex', gap:12, marginTop:6, fontSize:11, color:'#6b7280' }}>
          <span>⭕ Normal issue</span>
          <span style={{ color:'#EF4444' }}>🔴 SLA Breached (larger dot)</span>
          <span>Ring color = Status</span>
        </div>
      </div>

      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height:380, width:'100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        <FitBounds issues={validIssues} />
        {validIssues.map(issue => (
          <CircleMarker
            key={issue.id}
            center={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
            radius={issue.sla_breached ? 12 : parseInt(issue.duplicate_count||0)>0 ? 9 : 7}
            fillColor={CATEGORY_COLORS[issue.category] || '#6B7280'}
            color={STATUS_COLORS[issue.status] || '#fff'}
            weight={2}
            fillOpacity={0.85}
          >
            <Popup>
              <div style={{ fontSize:12, minWidth:160 }}>
                <div style={{ fontWeight:700, marginBottom:4 }}>
                  {CAT_ICONS[issue.category]} {issue.category?.toUpperCase()}
                </div>
                <div style={{ marginBottom:2 }}><strong>{issue.title || 'No title'}</strong></div>
                <div style={{ color:'#6b7280', marginBottom:4 }}>📍 {issue.ward_name || 'Unknown ward'}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <span style={{ background:(STATUS_COLORS[issue.status]||'#6b7280')+'20', color:STATUS_COLORS[issue.status]||'#6b7280', padding:'1px 6px', borderRadius:8, fontSize:10, fontWeight:600 }}>
                    {issue.status}
                  </span>
                  <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'1px 6px', borderRadius:8, fontSize:10 }}>
                    Priority: {parseFloat(issue.priority_score||0).toFixed(0)}
                  </span>
                </div>
                {parseInt(issue.duplicate_count||0)>0 && (
                  <div style={{ marginTop:4, color:'#8B5CF6', fontSize:10 }}>👥 {issue.duplicate_count} duplicate reports</div>
                )}
                {issue.sla_breached && (
                  <div style={{ marginTop:4, color:'#EF4444', fontWeight:600, fontSize:10 }}>⚠ SLA BREACHED</div>
                )}
                {issue.ai_confidence && (
                  <div style={{ marginTop:4, color:'#10B981', fontSize:10 }}>🤖 AI confidence: {(issue.ai_confidence*100).toFixed(0)}%</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}