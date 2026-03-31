'use client';
// app/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('lucascarvalho@corpflow.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { signIn } = await import('@/lib/supabase');

      // Master Access Fallback for the user
      if (email === 'lucascarvalho@corpflow.com' && password === 'corpflow.2026') {
        const { signIn, signUp } = await import('@/lib/supabase');
        
        // Tenta entrar silenciosamente no Supabase para garantir sessão (RLS)
        const { error: authError } = await signIn(email, password);
        
        if (authError) {
          // Se o usuário não existir no novo projeto, tentamos cadastrar automaticamente
          await signUp(email, password).catch(() => null);
          // Tenta entrar novamente após o cadastro/tentativa
          await signIn(email, password).catch(() => null);
        }

        // Marcamos uma sessão persistente no navegador para o acesso mestre
        // Isso sobrevive a atualizações e reinicializações do PWA
        localStorage.setItem('isMasterAuthenticated', 'true');
        router.push('/dashboard');
        return;
      }

      const { error: authError } = await signIn(email, password);
      
      if (authError) {
        setError('Email ou senha inválidos.');
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch (e) {
      setError('Ocorreu um erro ao tentar entrar.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', position: 'relative', overflow: 'hidden',
      fontFamily: 'Outfit, sans-serif',
    }}>
      {/* glow orbs */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        top: -300, right: -200, pointerEvents: 'none', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        bottom: -200, left: -200, pointerEvents: 'none', filter: 'blur(60px)' }} />

      <div className="animate-slideUp card-premium" style={{
        padding: '56px 48px', width: 440, maxWidth: '95vw',
        position: 'relative', zIndex: 1,
        background: 'linear-gradient(180deg, #111 0%, #050505 100%)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212,175,55,0.05)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--gold) 0%, #ae8625 100%)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 20, color: '#000', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)' }}>CF</div>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: '#fff' }}>
            Corp<span style={{ color: 'var(--gold)' }}>Flow</span>
          </span>
        </div>

        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5, color: '#fff' }}>Acesso Restrito</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 40, fontWeight: 500 }}>
          Bem-vindo ao centro de gestão CorpFlow
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Identificação corporativa</div>
          <input className="field-input" type="email" placeholder="seu@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Chave de acesso</div>
          <input className="field-input" type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>

        {error && (
          <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16, padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', background: loading ? 'var(--gold-dark)' : 'var(--gold)',
          color: '#000', border: 'none', borderRadius: 12, padding: '16px',
          fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer', marginTop: 16, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
        }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.4)'; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.3)'; }}
        >
          {loading ? 'Validando...' : 'ENTRAR NO SISTEMA'}
        </button>

        <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 32, fontWeight: 500 }}>
          Ambiente corporativo seguro e monitorado.
        </div>
      </div>
    </div>
  );
}
