import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BRAND } from '../config/brand'

export default function SavedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state

  useEffect(() => {
    if (!state || !state.present || state.total === undefined) {
      navigate('/attendance')
    }
  }, [state, navigate])

  if (!state) return null

  const { present, total, group } = state
  const absent = total - present
  const percentage = Math.round((present / total) * 100)
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleBackToAttendance = () => {
    navigate('/attendance')
  }

  return (
    <>
      <style>{`
        @keyframes popIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
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

        .check-circle {
          animation: popIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .ripple-effect {
          animation: ripple 1.2s ease-out;
        }

        .fade-element {
          animation: fadeUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .fade-delay-1 { animation-delay: 0.4s; }
        .fade-delay-2 { animation-delay: 0.5s; }
        .fade-delay-3 { animation-delay: 0.7s; }
      `}</style>

      <div
        style={{
          minHeight: '100dvh',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          background: `linear-gradient(160deg, #F9F7F3 0%, #FAFAF8 50%, #FFFFFF 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* CHECK ANIMADO */}
        <div
          style={{
            position: 'relative',
            marginBottom: '32px',
          }}
        >
          {/* Efecto ripple */}
          <div
            className="ripple-effect"
            style={{
              position: 'absolute',
              width: '86px',
              height: '86px',
              borderRadius: '50%',
              border: `2px solid ${BRAND.burgundy}`,
              top: 0,
              left: 0,
            }}
          />

          {/* Círculo check */}
          <div
            className="check-circle"
            style={{
              width: '86px',
              height: '86px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 24px rgba(128,0,0,0.3)`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* TÍTULO */}
        <h1
          className="fade-element fade-delay-1"
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '22px',
            fontWeight: 700,
            color: BRAND.textDark,
            margin: '0 0 8px 0',
            textAlign: 'center',
          }}
        >
          Asistencia guardada
        </h1>

        {/* SUBTÍTULO */}
        <p
          className="fade-element fade-delay-2"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
            color: BRAND.textMuted,
            margin: '0 0 28px 0',
            textAlign: 'center',
          }}
        >
          Samuel — Grupo {group} · {today}
        </p>

        {/* CARD RESUMEN */}
        <div
          className="fade-element fade-delay-3"
          style={{
            width: '100%',
            maxWidth: '340px',
            background: BRAND.white,
            border: `1.5px solid ${BRAND.border}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: `0 4px 16px rgba(0,0,0,0.08)`,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'Presentes', value: present, color: BRAND.success, bg: BRAND.successSoft, icon: '✓' },
            { label: 'Ausentes', value: absent, color: BRAND.error, bg: BRAND.errorSoft, icon: '✗' },
            { label: 'Asistencia', value: `${percentage}%`, color: BRAND.burgundy, bg: BRAND.burgundySoft, icon: '◉' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: stat.bg,
                borderRadius: '12px',
                padding: '14px 8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '26px',
                  fontWeight: 700,
                  color: stat.color,
                  marginBottom: '4px',
                }}
              >
                {stat.icon} {stat.value}
              </div>
              <div
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '9px',
                  color: stat.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* BOTÓN VOLVER */}
        <button
          onClick={handleBackToAttendance}
          style={{
            background: `linear-gradient(135deg, ${BRAND.burgundy}, ${BRAND.burgundyLight})`,
            color: BRAND.white,
            border: 'none',
            borderRadius: '13px',
            padding: '14px 32px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 6px 20px rgba(128,0,0,0.25)`,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = `0 8px 28px rgba(128,0,0,0.35)`
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = `0 6px 20px rgba(128,0,0,0.25)`
          }}
        >
          Volver al inicio
        </button>
      </div>
    </>
  )
}
