import { Component } from 'react'

/**
 * Error Boundary global — captura errores de renderizado en el arbol de React.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-dvh min-h-screen w-full max-w-[430px] mx-auto bg-dark-bg flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-6">!</div>
        <h1 className="font-cinzel text-xl font-bold text-gold mb-2">
          Algo salio mal
        </h1>
        <p className="font-montserrat text-sm text-white/60 mb-6 leading-relaxed">
          Ha ocurrido un error inesperado. Puedes intentar recargar la aplicacion.
        </p>
        <button
          onClick={this.handleReload}
          className="bg-burgundy text-gold font-montserrat text-sm font-semibold px-6 py-3 rounded-xl border-none cursor-pointer transition-opacity hover:opacity-90"
        >
          Recargar
        </button>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-6 text-left text-xs text-white/40 bg-white/5 rounded-lg p-4 max-w-full overflow-auto">
            {this.state.error.message}
          </pre>
        )}
      </div>
    )
  }
}
