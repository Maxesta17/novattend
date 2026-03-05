/**
 * Contenedor mobile-first con frame de dispositivo en desktop.
 * Nota: las media queries de desktop requieren CSS puro (Tailwind no soporta
 * selectores como #root desde un componente). Se mantiene un bloque <style>
 * minimo para eso.
 * @param {object} props
 * @param {React.ReactNode} props.children - Contenido de la pagina
 */
export default function MobileContainer({ children }) {
  return (
    <>
      <style>{`
        @media (min-width: 480px) {
          #root {
            background-color: #111111;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px 0;
            min-height: 100vh;
          }
          .mobile-container {
            max-width: 430px;
            min-height: 100vh;
            border-radius: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            overflow: hidden;
          }
        }
      `}</style>
      <div className="mobile-container w-full min-h-screen">
        {children}
      </div>
    </>
  )
}
