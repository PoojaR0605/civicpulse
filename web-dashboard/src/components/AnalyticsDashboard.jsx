import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AnalyticsDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/issues/analytics').then(res => {
      if (res.data.success) setData(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>Loading analytics...</div>;
  if (!data)   return null;

  const { summary, byCategory, byWard } = data;

  const CAT_ICONS = { pothole:'🕳️', garbage:'🗑️', streetlight:'💡', sewage:'🚰', encroachment:'🚧', waterlogging:'🌊', other:'📋' };

  return (
    <div style={{ padding:'0 0 24px 0' }}>
      <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16, color:'#111' }}>📊 Analytics Overview</h3>

      {/* Summary row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Complaints', value:summary.total,              color:'#1976D2', icon:'📋' },
          { label:'Pending',          value:summary.pending,            color:'#F59E0B', icon:'⏳' },
          { label:'Overdue',          value:summary.overdue,            color:'#EF4444', icon:'⚠️' },
          { label:'Duplicates Merged',value:summary.duplicates_merged,  color:'#8B5CF6', icon:'🔗' },
        ].map(card => (
          <div key={card.label} style={{ background:'#fff', borderRadius:8, padding:'14px 16px', border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{card.icon}</div>
            <div style={{ fontSize:26, fontWeight:700, color:card.color }}>{card.value || 0}</div>
            <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {summary.avg_resolution_hours && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 16px', fontSize:13, color:'#166534', marginBottom:20 }}>
          ⚡ Average resolution time: <strong>{summary.avg_resolution_hours} hours</strong>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* By Category */}
        <div style={{ background:'#fff', borderRadius:8, border:'1px solid #e5e7eb', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', fontWeight:600, fontSize:13 }}>By Category</div>
          <div style={{ padding:'8px 0' }}>
            {byCategory.map(cat => (
              <div key={cat.category} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span>{CAT_ICONS[cat.category]||'📋'}</span>
                  <span style={{ fontSize:13, textTransform:'capitalize' }}>{cat.category}</span>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#10B981' }}>{cat.resolved} resolved</span>
                  <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:600 }}>{cat.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Ward */}
        <div style={{ background:'#fff', borderRadius:8, border:'1px solid #e5e7eb', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', fontWeight:600, fontSize:13 }}>By Ward</div>
          <div style={{ padding:'8px 0' }}>
            {byWard.filter(w => w.ward_name).map(ward => (
              <div key={ward.ward_name} style={{ padding:'8px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:500 }}>📍 {ward.ward_name}</span>
                  <span style={{ fontSize:11, color:'#6b7280' }}>{ward.total} total</span>
                </div>
                <div style={{ background:'#f3f4f6', borderRadius:4, height:6, overflow:'hidden' }}>
                  <div style={{ width:`${Math.min(100,(ward.resolved/ward.total)*100||0)}%`, height:'100%', background:'#10B981', borderRadius:4 }} />
                </div>
                <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>
                  {Math.round((ward.resolved/ward.total)*100||0)}% resolved {ward.overdue>0&&`• ${ward.overdue} overdue`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}