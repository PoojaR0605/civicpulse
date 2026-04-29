import { useState } from 'react';
import { login } from '../services/api';

const GRADIENT = 'linear-gradient(135deg, #1976D2 0%, #0d47a1 100%)';

export default function LoginPage({ onLogin, onRegister }) {
  const [role,     setRole]     = useState('citizen');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await login(email, password);
      if (res.data.success) {
        const user = res.data.data.user;
        if (role === 'officer' && user.role === 'citizen') {
          setError('This is a citizen account. Please select Citizen.'); setLoading(false); return;
        }
        if (role === 'citizen' && user.role !== 'citizen') {
          setError('This is an officer account. Please select Officer.'); setLoading(false); return;
        }
        localStorage.setItem('token', res.data.data.accessToken);
        localStorage.setItem('user',  JSON.stringify(user));
        onLogin(user);
      }
    } catch(err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left panel */}
      <div style={{ flex:1, background:GRADIENT, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:48, color:'#fff' }}>
        <div style={{ maxWidth:400 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🏙️</div>
          <h1 style={{ fontSize:36, fontWeight:800, marginBottom:12, lineHeight:1.2 }}>CivicPulse</h1>
          <p style={{ fontSize:18, opacity:0.9, marginBottom:32, lineHeight:1.6 }}>
            Smart civic issue reporting platform for Bengaluru
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { icon:'📍', text:'GPS-verified complaint reporting' },
              { icon:'🤖', text:'AI-powered issue validation' },
              { icon:'⚡', text:'Real-time status updates' },
              { icon:'🗺️', text:'Ward-level issue tracking' },
            ].map(f => (
              <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'12px 16px' }}>
                <span style={{ fontSize:20 }}>{f.icon}</span>
                <span style={{ fontSize:14, opacity:0.95 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:480, display:'flex', flexDirection:'column', justifyContent:'center', padding:48, background:'#fff' }}>
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:28, fontWeight:700, color:'#111', marginBottom:6 }}>Welcome back</h2>
          <p style={{ color:'#6b7280', fontSize:15 }}>Sign in to your account to continue</p>
        </div>

        {/* Role toggle */}
        <div style={{ display:'flex', background:'#f3f4f6', borderRadius:10, padding:4, marginBottom:28 }}>
          {[['citizen','👤 Citizen'],['officer','🏛 Officer']].map(([r,label]) => (
            <button key={r} type="button" onClick={() => { setRole(r); setError(''); }} style={{
              flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600,
              border:'none', cursor:'pointer', transition:'all 0.2s',
              background: role===r ? '#fff' : 'transparent',
              color: role===r ? '#1976D2' : '#6b7280',
              boxShadow: role===r ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {role === 'officer' && (
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#1e40af', marginBottom:20, display:'flex', gap:8, alignItems:'flex-start' }}>
            <span>ℹ️</span>
            <span>Officer accounts are registered by admin. Contact your department if you don't have credentials.</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder={role==='officer'?'officer@bbmp.gov.in':'your@email.com'}
              style={{ width:'100%', padding:'12px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, boxSizing:'border-box', outline:'none', transition:'border 0.2s' }}
              onFocus={e => e.target.style.borderColor='#1976D2'}
              onBlur={e => e.target.style.borderColor='#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Enter your password"
                style={{ width:'100%', padding:'12px 44px 12px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, boxSizing:'border-box', outline:'none' }}
                onFocus={e => e.target.style.borderColor='#1976D2'}
                onBlur={e => e.target.style.borderColor='#e5e7eb'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:16 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:16, display:'flex', gap:8 }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:13, background:loading?'#93c5fd':GRADIENT,
            color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700,
            cursor:loading?'not-allowed':'pointer', transition:'all 0.2s',
            boxShadow: loading?'none':'0 4px 12px rgba(25,118,210,0.4)',
          }}>
            {loading ? '⏳ Signing in...' : `Sign in as ${role==='officer'?'Officer':'Citizen'}`}
          </button>
        </form>

        {role === 'citizen' && (
          <div style={{ textAlign:'center', marginTop:24 }}>
            <span style={{ color:'#6b7280', fontSize:14 }}>Don't have an account? </span>
            <button onClick={onRegister} style={{ background:'none', border:'none', color:'#1976D2', cursor:'pointer', fontWeight:700, fontSize:14 }}>
              Create account →
            </button>
          </div>
        )}

        <div style={{ marginTop:32, padding:'16px 0', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'center', gap:24 }}>
          <span style={{ fontSize:11, color:'#9ca3af' }}>🔒 Secure login</span>
          <span style={{ fontSize:11, color:'#9ca3af' }}>📍 GPS verified</span>
          <span style={{ fontSize:11, color:'#9ca3af' }}>🤖 AI powered</span>
        </div>
      </div>
    </div>
  );
}