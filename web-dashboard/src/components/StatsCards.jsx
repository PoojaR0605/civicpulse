export default function StatsCards({ issues }) {
  const total      = issues.length;
  const resolved   = issues.filter(i => i.status === 'resolved').length;
  const inProgress = issues.filter(i => i.status === 'in_progress').length;
  const breached   = issues.filter(i => i.sla_breached).length;

  const cards = [
    { label: 'Total Issues', value: total,      color: '#1976D2' },
    { label: 'In Progress',  value: inProgress, color: '#F59E0B' },
    { label: 'Resolved',     value: resolved,   color: '#10B981' },
    { label: 'SLA Breached', value: breached,   color: '#EF4444' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 24,
    }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: '#fff',
          borderRadius: 8,
          padding: '16px 20px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
            {card.value}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}