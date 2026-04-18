import { useState, useEffect, useCallback } from 'react';
import { getIssues } from '../services/api';
import {
  connectSocket, joinWard,
  onNewIssue, onStatusChange, onSLABreach,
  disconnectSocket,
} from '../services/socket';
import StatsCards from '../components/StatsCards';
import IssueTable from '../components/IssueTable';
import IssueMap   from '../components/IssueMap';

export default function DashboardPage({ user, onLogout }) {
  const [issues,  setIssues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [alerts,  setAlerts]  = useState([]);

  const fetchIssues = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await getIssues(params);
      if (res.data.success) setIssues(res.data.data.issues || []);
    } catch (e) {
      console.error('Failed to fetch issues:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    connectSocket(token);
    joinWard(user?.ward_id || 'general');   // ✅ Fixed — uses officer's actual ward
    onNewIssue((data) => {
      setAlerts(prev => [`New issue: ${data.category} in ${data.ward}`, ...prev.slice(0, 4)]);
      fetchIssues();
    });
    onStatusChange(() => fetchIssues());
    onSLABreach((data) => {
      setAlerts(prev => [`SLA BREACH: ${data.category} — ${data.title}`, ...prev.slice(0, 4)]);
      fetchIssues();
    });
    return () => disconnectSocket();
  }, [fetchIssues]);

  const filteredIssues = filter === 'all'
    ? issues
    : issues.filter(i => i.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{
        background: '#1976D2', padding: '0 24px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
          CivicPulse — Municipal Dashboard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#bfdbfe', fontSize: 13 }}>
            {user?.name} ({user?.department || 'Officer'})
          </span>
          <button onClick={onLogout} style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            border: 'none', padding: '6px 14px', borderRadius: 6,
            cursor: 'pointer', fontSize: 13,
          }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {alerts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{
                background: alert.includes('BREACH') ? '#fef2f2' : '#eff6ff',
                border: `1px solid ${alert.includes('BREACH') ? '#fecaca' : '#bfdbfe'}`,
                color: alert.includes('BREACH') ? '#991b1b' : '#1e40af',
                padding: '8px 16px', borderRadius: 6, fontSize: 13,
                marginBottom: 6, display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{alert}</span>
                <button
                  onClick={() => setAlerts(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <StatsCards issues={issues} />
        <IssueMap issues={issues} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all','submitted','validated','in_progress','resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 16px', borderRadius: 20,
              border: '1px solid #d1d5db',
              background: filter === f ? '#1976D2' : '#fff',
              color: filter === f ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: 13,
              fontWeight: filter === f ? 600 : 400,
            }}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
          <button onClick={fetchIssues} style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: 20,
            border: '1px solid #d1d5db', background: '#fff',
            cursor: 'pointer', fontSize: 13,
          }}>Refresh</button>
        </div>

        {loading
          ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
          : <IssueTable issues={filteredIssues} onUpdate={fetchIssues} />
        }
      </div>
    </div>
  );
}