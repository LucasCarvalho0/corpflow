// components/StatCard.tsx

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  delta?: string;
  deltaUp?: boolean;
  accent?: 'gold' | 'green' | 'red' | 'blue';
}

const accentColors: Record<string, string> = {
  gold: 'var(--gold)', green: 'var(--success)', red: 'var(--danger)', blue: 'var(--info)',
};

export default function StatCard({ icon, value, label, delta, deltaUp = true, accent = 'gold' }: StatCardProps) {
  return (
    <div className="card-premium" style={{
      padding: '24px', position: 'relative', overflow: 'hidden',
      background: 'var(--bg-card)'
    }}>
      {/* background glow effect */}
      <div style={{
        position: 'absolute', right: -30, top: -30, width: 100, height: 100, borderRadius: '50%',
        background: accentColors[accent], opacity: 0.08, filter: 'blur(30px)', pointerEvents: 'none',
      }} />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
        {delta && (
          <div style={{
            fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
            background: deltaUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: deltaUp ? 'var(--success)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Outfit, sans-serif'
          }}>
            {deltaUp ? '▲' : '▼'} {delta}
          </div>
        )}
      </div>

      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.2, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontWeight: 500, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}
