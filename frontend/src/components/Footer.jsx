import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#035c43] text-white py-10">
      <div className="max-w-5xl mx-auto px-4">
        {/* Sección Superior */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex shrink-0 items-center justify-center text-[#035c43] font-black italic text-lg shadow-lg border-2 border-[#024230]">
              LP
            </div>
            <span className="font-bold text-white text-xl tracking-tight">
              La Peca Decide
            </span>
          </div>
          <p className="text-sm mt-4 text-white/80 max-w-md">
            Plataforma de participación ciudadana para el fomento de la cultura, la exportación del café y el desarrollo turístico de nuestro distrito.
          </p>
        </div>

        {/* Sección Media (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div>
            <h3 className="font-bold mb-4">Enlaces Rápidos</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/" className="text-sm text-white/80 hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/votacion" className="text-sm text-white/80 hover:text-white transition-colors">
                  Centro de Votación
                </Link>
              </li>
              <li>
                <Link to="/transparencia" className="text-sm text-white/80 hover:text-white transition-colors">
                  Política de Transparencia
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Garantía de Proceso</h3>
            <p className="text-sm text-white/80">
              Tus votos son verificados con los estándares de RENIEC y asegurados por nuestra tecnología. Un voto, una persona.
            </p>
          </div>
        </div>

        {/* Sección Inferior */}
        <div className="mt-10 pt-6 border-t border-white/20 text-center text-xs text-white/60">
          © 2026 Distrito de La Peca - Amazonas. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
