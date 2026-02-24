import { useNavigate } from 'react-router-dom'
import { BRAND } from '../config/brand'
import { useState } from 'react'
import { USERS } from '../config/users'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleLogin = () => {
    setError('')
    const found = USERS.find(u => u.username.toLowerCase() === (username || '').trim().toLowerCase() && u.password === password)
    if (!found) {
      setError('Usuario o contraseña incorrectos')
      setShake(true)
      setTimeout(() => setShake(false), 700)
      return
    }

    try { sessionStorage.setItem('user', JSON.stringify(found)) } catch (e) {}

    if (found.role === 'ceo') {
      navigate('/dashboard')
    } else {
      navigate('/attendance', { state: { user: found } })
    }
  }

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-animate {
          animation: float 4s ease-in-out infinite;
        }

        .fade-element {
          animation: fadeUp 0.6s ease-out forwards;
        }

        .fade-delay-1 { animation-delay: 0s; }
        .fade-delay-2 { animation-delay: 0.1s; }
        .fade-delay-3 { animation-delay: 0.18s; }
        .fade-delay-4 { animation-delay: 0.25s; }
        .fade-delay-5 { animation-delay: 0.35s; }
        .fade-delay-6 { animation-delay: 0.5s; }

        .btn-google {
          transition: all 0.3s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .btn-google:hover {
          transform: translateY(-2px);
          background-color: rgba(255, 255, 255, 0.08) !important;
          border-color: ${BRAND.gold} !important;
        }

        .btn-google:active {
          transform: translateY(0);
          background-color: rgba(255, 255, 255, 0.06) !important;
        }

        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid #C5A05925;
          border-radius: 14px;
          padding: 15px 16px 15px 48px;
          color: white;
          font-family: Montserrat, sans-serif;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }

        .input-field:focus {
          border: 1px solid #C5A05950;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.9);
        }

        .input-field::placeholder { color: rgba(255,255,255,0.3); }

        .btn-login {
          background: linear-gradient(135deg, #800000, #9A1515);
          color: white;
          border-radius: 14px;
          padding: 15px;
          width: 100%;
          font-family: Montserrat, sans-serif;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-login:hover { transform: translateY(-2px); }

        .error-message { color: #FF4D4F; margin-top: 12px; font-family: Montserrat, sans-serif; font-size: 13px; }

        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }

        .shake { animation: shake 0.6s; }

        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        #root {
          width: 100%;
          height: 100%;
        }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          background: `linear-gradient(170deg, #1A1A1A 0%, #2A1A1A 40%, #5C0000 100%)`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          boxSizing: 'border-box',
        }}
      >
        {/* Patrón decorativo diagonal */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(197, 160, 89, 0.02) 2px, rgba(197, 160, 89, 0.02) 4px)',
            pointerEvents: 'none',
          }}
        />

        {/* Resplandor granate arriba centro */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '500px',
            background: `radial-gradient(circle, rgba(128, 0, 0, 0.3) 0%, transparent 70%)`,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Resplandor dorado abajo derecha */}
        <div
          style={{
            position: 'absolute',
            bottom: '-5%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: `radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Contenedor principal */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '360px',
          }}
        >
          {/* Logo */}
          <img
            className="logo-animate fade-element fade-delay-1"
            src="/logova1.png"
            alt="NovAttend"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: 0,
              marginBottom: '28px',
              boxShadow: '0 0 30px rgba(128, 0, 0, 0.4), 0 0 60px rgba(128, 0, 0, 0.2)',
              objectFit: 'cover',
            }}
          />

          {/* Texto principal "NovAttend" */}
          <h1
            className="fade-element fade-delay-2"
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '28px',
              fontWeight: 700,
              color: BRAND.gold,
              margin: '0 0 6px 0',
              letterSpacing: '-0.5px',
              textAlign: 'center',
            }}
          >
            NovAttend
          </h1>

          {/* Subtítulo */}
          <p
            className="fade-element fade-delay-3"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '13px',
              color: `rgba(255, 255, 255, 0.55)`,
              margin: '0 0 22px 0',
              fontWeight: 400,
            }}
          >
            Control de Asistencia
          </p>

          {/* Separador con texto */}
          <div
            className="fade-element fade-delay-4"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '32px',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to right, transparent, ${BRAND.gold}40)`,
              }}
            />
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                color: `${BRAND.gold}E6`,
                letterSpacing: '3px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              LINGNOVA ACADEMY
            </span>
            <div
              style={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to left, transparent, ${BRAND.gold}40)`,
              }}
            />
          </div>

          <div className={`fade-element fade-delay-5 ${shake ? 'shake' : ''}`} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/><path d="M6 20c0-2.21 3.58-4 6-4s6 1.79 6 4"/></svg>
              </div>
              <input
                className="input-field"
                placeholder="Usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V8a5 5 0 0 1 10 0v3"/></svg>
              </div>
              <input
                className="input-field"
                placeholder="Contraseña"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button className="btn-login" onClick={handleLogin}>Iniciar sesión</button>

            {error && <div className={`error-message ${shake ? 'shake' : ''}`}>{error}</div>}
          </div>

          {/* Texto disclaimer */}
          <p
            className="fade-element fade-delay-6"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: `rgba(255, 255, 255, 0.2)`,
              marginTop: '20px',
              textAlign: 'center',
              fontWeight: 400,
            }}
          >
              Acceso exclusivo profesores
          </p>
        </div>
      </div>
    </>
  )
}
