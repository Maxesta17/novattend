import '../styles/mobile-container.css'

/**
 * Contenedor mobile-first con frame de dispositivo en desktop.
 * Los estilos de media query desktop estan en src/styles/mobile-container.css.
 * @param {object} props
 * @param {React.ReactNode} props.children - Contenido de la pagina
 */
export default function MobileContainer({ children }) {
  return (
    <div className="mobile-container w-full min-h-screen">
      {children}
    </div>
  )
}
