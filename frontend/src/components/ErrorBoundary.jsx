import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que la siguiente renderización muestre la UI de repuesto
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Aquí puedes registrar el error en un servicio de reporte de errores
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Opcional: Logo de La Peca si existe, o un escudo estilizado */}
            <div className="w-24 h-24 mx-auto bg-[#035c43] rounded-full flex items-center justify-center mb-6 shadow-lg">
              <span className="text-white text-3xl font-bold">LP</span>
            </div>
            
            <h1 className="text-2xl font-bold text-[#035c43]">Error de Conexión</h1>
            
            <p className="text-gray-600">
              Ocurrió un error inesperado al procesar la información. Esto puede deberse a una intermitencia en la red o en el servidor.
            </p>
            
            <button
              onClick={this.handleReload}
              className="mt-6 px-6 py-3 bg-[#035c43] text-white rounded-xl font-bold hover:bg-[#024532] transition-colors shadow-md w-full sm:w-auto"
            >
              Recargar la página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
