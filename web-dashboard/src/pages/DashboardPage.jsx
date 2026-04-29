import { useState, useEffect, useCallback } from 'react';
import { getIssues } from '../services/api';
import {
  connectSocket, joinWard,
  onNewIssue, onStatusChange, onSLABreach,
  disconnectSocket,
} from '../services/socket';
import StatsCards        from '../components/StatsCards';
import IssueTable        from '../components/IssueTable';
import IssueMap          from '../components/IssueMap';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

export default function DashboardPage({ user, onLogout }) {
  const [issues,       setIssues]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [alerts,       setAlerts]       = useState([]);
  const [activeTab,    setActiveTab]    = useState('issues'); // issues | analytics
  const [unwardIssues, setUnwardIssues] = useState([]);

  const fetchIssues = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await getIssues(params);
      if (res.data.success) {
        const all = res.data.data?.issues || res.data.data || [];
        setIssues(all);
        setUnwardIssues(all.filter(i => !i.ward_id && !i.ward_name));
      }
    } catch(e) {
      console.error('Failed to fetch issues:', e.response?.data || e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    connectSocket(token);
    joinWard(user?.ward_id || 'general');
    onNewIssue((data) => {
      setAlerts(prev => [`🆕 New issue: ${data.category} in ${data.ward||'unknown ward'}`, ...prev.slice(0,4)]);
      fetchIssues();
    });
    onStatusChange(() => fetchIssues());
    onSLABreach((data) => {
      setAlerts(prev => [`⚠ SLA BREACH: ${data.category} — ${data.title}`, ...prev.slice(0,4)]);
      fetchIssues();
    });
    return () => disconnectSocket();
  }, [fetchIssues]);

  const filteredIssues = filter === 'all' ? issues : issues.filter(i => i.status === filter);

  return (
    <div style={{ minHeight:'100vh', background:'#f3f4f6', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #1976D2, #0d47a1)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>🏙️</span>
          <span style={{ color:'#fff', fontWeight:800, fontSize:18 }}>CivicPulse</span>
          <span style={{ color:'rgba(255,255,255,0.5)', fontSize:14 }}>|</span>
          <span style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>Municipal Dashboard</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>{user?.name}</div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>{user?.department} • {user?.role}</div>
          </div>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', padding:'6px 16px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500 }}>
            Logout
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 24px', display:'flex', gap:0 }}>
        {[['issues','📋 Issues'],['analytics','📊 Analytics']].map(([key,label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ padding:'14px 20px', border:'none', background:'none', fontSize:14, fontWeight:activeTab===key?600:400, color:activeTab===key?'#1976D2':'#6b7280', borderBottom:activeTab===key?'2px solid #1976D2':'2px solid transparent', cursor:'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding:24 }}>
        {/* Unward alert */}
        {unwardIssues.length > 0 && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
            <div style={{ fontWeight:600, color:'#92400e', marginBottom:4 }}>
              ⚠ {unwardIssues.length} complaint{unwardIssues.length>1?'s':''} outside known ward boundaries
            </div>
            <div style={{ fontSize:12, color:'#92400e' }}>
              These locations need manual ward assignment. GPS coordinates are available.
            </div>
          </div>
        )}

        {/* Real-time alerts */}
        {alerts.length > 0 && (
          <div style={{ marginBottom:16 }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ background:alert.includes('⚠')?'#fef2f2':'#eff6ff', border:`1px solid ${alert.includes('⚠')?'#fecaca':'#bfdbfe'}`, color:alert.includes('⚠')?'#991b1b':'#1e40af', padding:'8px 16px', borderRadius:6, fontSize:13, marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{alert}</span>
                <button onClick={() => setAlerts(prev => prev.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:16 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'issues' && (
          <>
            <StatsCards issues={issues} />
            <IssueMap issues={issues} />
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              {['all','submitted','validated','in_progress','resolved'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 16px', borderRadius:20, border:'1px solid #d1d5db', background:filter===f?'#1976D2':'#fff', color:filter===f?'#fff':'#374151', cursor:'pointer', fontSize:13, fontWeight:filter===f?600:400 }}>
                  {f==='all'?'All':f.replace('_',' ')}
                </button>
              ))}
              <button onClick={() => fetchIssues(true)} disabled={refreshing} style={{ marginLeft:'auto', padding:'6px 16px', borderRadius:20, border:'1px solid #d1d5db', background:refreshing?'#e5e7eb':'#fff', cursor:refreshing?'not-allowed':'pointer', fontSize:13 }}>
                {refreshing?'⟳ Refreshing...':'⟳ Refresh'}
              </button>
            </div>
            {loading
              ? <div style={{ textAlign:'center', padding:40, color:'#6b7280' }}>Loading issues...</div>
              : <IssueTable issues={filteredIssues} onUpdate={() => fetchIssues(true)} />
            }
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
}