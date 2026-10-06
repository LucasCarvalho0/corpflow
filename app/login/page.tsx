'use client';
// app/login/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  name: string;
  shortName: string;
  role: string;
  initials: string;
  welcomeMessage: string;
  emails: string[];
  password: string;
}

const AUTHORIZED_USERS: AuthUser[] = [
  {
    name: 'Janaína Mendes',
    shortName: 'Janaína',
    role: 'Gestora Administrativa',
    initials: 'JM',
    welcomeMessage: 'Bem-vinda, Janaína, ao seu sistema de gestão.',
    emails: [
      'janaina.mendes@corpoflow.com',
      'janaina.mendes@corpflow.com',
    ],
    password: 'Janaina.116265',
  },
  {
    name: 'Lucas Carvalho',
    shortName: 'Lucas',
    role: 'Gestor Administrativo',
    initials: 'LC',
    welcomeMessage: 'Bem-vindo, Lucas, ao seu sistema de gestão.',
    emails: [
      'lucascarvalho@corpflow.com',
      'lucascarvalho@corpoflow.com',
    ],
    password: 'corpflow.2026',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de tela de carregamento pós-login
  const [isSuccessLoading, setIsSuccessLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [welcomeText, setWelcomeText] = useState('');
  const [loadingStepText, setLoadingStepText] = useState('Autenticando credenciais corporativas...');

  useEffect(() => {
    if (!isSuccessLoading) return;

    // Animação de barra e progresso de 0% a 100%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }

        const increment = prev < 30 ? 4 : prev < 75 ? 6 : prev < 95 ? 4 : 2;
        const next = Math.min(100, prev + increment);

        if (next < 30) {
          setLoadingStepText('Autenticando credenciais corporativas...');
        } else if (next < 65) {
          setLoadingStepText('Sincronizando módulos e permissões...');
        } else if (next < 95) {
          setLoadingStepText('Carregando ambiente de gestão...');
        } else {
          setLoadingStepText('Acesso liberado! Entrando no sistema...');
        }

        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [isSuccessLoading]);

  // Ao chegar em 100%, redireciona para o dashboard
  useEffect(() => {
    if (progress === 100 && isSuccessLoading) {
      const timeout = setTimeout(() => {
        router.push('/dashboard');
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [progress, isSuccessLoading, router]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    // Valida contra a lista de usuários autorizados
    const matchedUser = AUTHORIZED_USERS.find((u) =>
      u.emails.some((e) => e.toLowerCase() === normalizedEmail) && u.password === password
    );

    if (matchedUser) {
      // Grava autenticação Master e perfil do usuário no localStorage
      localStorage.setItem('isMasterAuthenticated', 'true');
      localStorage.setItem('currentUser', JSON.stringify({
        name: matchedUser.name,
        shortName: matchedUser.shortName,
        email: normalizedEmail,
        role: matchedUser.role,
        initials: matchedUser.initials,
      }));

      setWelcomeText(matchedUser.welcomeMessage);
      setIsSuccessLoading(true);
      return;
    }

    setError('Identificação corporativa ou chave de acesso incorreta.');
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', position: 'relative', overflow: 'hidden',
      fontFamily: 'Outfit, sans-serif',
    }}>
      {/* Glow Orbs */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        top: -300, right: -200, pointerEvents: 'none', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        bottom: -200, left: -200, pointerEvents: 'none', filter: 'blur(60px)' }} />

      {/* Tela de Carregamento pós-login com barra de progresso de 0% a 100% */}
      {isSuccessLoading ? (
        <div className="animate-slideUp card-premium" style={{
          padding: '60px 48px', width: 480, maxWidth: '95vw',
          position: 'relative', zIndex: 1,
          background: 'var(--bg-surface)',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 50px rgba(212,175,55,0.1)',
        }}>
          {/* Logo animado com pulso dourado */}
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, var(--gold) 0%, #ae8625 100%)',
            borderRadius: 20, margin: '0 auto 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 30, color: '#000',
            boxShadow: '0 8px 30px rgba(212, 175, 55, 0.5)',
            animation: 'pulse 2s infinite ease-in-out',
          }}>
            CF
          </div>

          {/* Mensagem personalizada */}
          <h2 style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: -0.5, lineHeight: 1.3, marginBottom: 12,
            fontFamily: 'Outfit, sans-serif',
          }}>
            {welcomeText}
          </h2>

          <div style={{
            color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
            marginBottom: 36, minHeight: 22,
          }}>
            {loadingStepText}
          </div>

          {/* Porcentagem de Carregamento */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginBottom: 10, padding: '0 4px',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Carregando
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)', fontFamily: 'Outfit, sans-serif' }}>
              {progress}%
            </span>
          </div>

          {/* Barra de Progresso */}
          <div style={{
            width: '100%', height: 12, background: 'rgba(0,0,0,0.06)',
            borderRadius: 999, overflow: 'hidden', padding: 2,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: 28,
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #d4af37 0%, #f59e0b 50%, #eab308 100%)',
              boxShadow: '0 0 12px rgba(212,175,55,0.7)',
              transition: 'width 0.08s ease-out',
            }} />
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>
            Ambiente corporativo seguro e monitorado.
          </div>
        </div>
      ) : (
        /* Formulário de Login */
        <div className="animate-slideUp card-premium" style={{
          padding: '56px 48px', width: 440, maxWidth: '95vw',
          position: 'relative', zIndex: 1,
          background: 'var(--bg-surface)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 40px rgba(212,175,55,0.05)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--gold) 0%, #ae8625 100%)', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 20, color: '#000', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)' }}>CF</div>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)' }}>
              Corp<span style={{ color: 'var(--gold)' }}>Flow</span>
            </span>
          </div>

          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5, color: 'var(--text-primary)' }}>Acesso Restrito</div>
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
      )}
    </div>
  );
}
