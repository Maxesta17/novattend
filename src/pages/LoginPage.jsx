import { useNavigate } from 'react-router-dom'
import { BRAND } from '../config/brand'

export default function LoginPage() {
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    navigate('/attendance')
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
          <div
            className="logo-animate fade-element fade-delay-1"
            style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              borderRadius: '22px',
              background: `linear-gradient(140deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '28px',
              boxShadow: `0 0 40px rgba(128, 0, 0, 0.5), 0 20px 40px rgba(0, 0, 0, 0.4)`,
            }}
          >
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '24px',
                fontWeight: 800,
                color: BRAND.gold,
                letterSpacing: '-0.5px',
              }}
            >
              NA
            </span>

            {/* Borde interior dorado */}
            <div
              style={{
                position: 'absolute',
                inset: '3px',
                borderRadius: '18px',
                border: `1.5px solid ${BRAND.gold}`,
                opacity: 0.3,
                pointerEvents: 'none',
              }}
            />
          </div>

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

          {/* Botón Google */}
          <button
            className="btn-google fade-element fade-delay-5"
            onClick={handleGoogleLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              borderRadius: '14px',
              border: `1px solid ${BRAND.gold}25`,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '15px 34px',
              minHeight: '48px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              color: 'white',
              fontWeight: 500,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Iniciar sesión con Google
          </button>

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
            Solo profesores autorizados
          </p>
        </div>
      </div>
    </>
  )
}
