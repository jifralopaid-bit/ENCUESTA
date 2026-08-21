import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Leaf, ShieldCheck, Home, Vote } from 'lucide-react';

const MainLayout = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen font-sans flex flex-col bg-gray-50">
      {/* Navbar Sticky */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo / Brand */}
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src="https://res.cloudinary.com/lqgq6nsm/image/upload/f_auto,q_auto/image-removebg-preview" 
                alt="Logo La Peca" 
                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="font-bold text-xl text-gray-800 tracking-tight">
                La Peca <span className="text-emerald-700">Decide</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                to="/" 
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/') ? 'text-emerald-700' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                <Home size={18} />
                Inicio
              </Link>
              
              <Link 
                to="/votacion" 
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/votacion') ? 'text-emerald-700' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                <Vote size={18} />
                Votación
              </Link>

              <Link 
                to="/transparencia" 
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/transparencia') ? 'text-emerald-700' : 'text-gray-600 hover:text-emerald-700'
                }`}
              >
                <ShieldCheck size={18} />
                Transparencia
              </Link>
            </div>
            
            {/* CTA Votar - Visible en Desktop */}
            <div className="hidden md:flex">
              <Link 
                to="/votacion" 
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-full font-medium text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Votar Ahora
              </Link>
            </div>

            {/* Mobile Menu Button (Omitted logic for simplicity, could add later if needed) */}
            <div className="md:hidden flex items-center">
              <Link 
                to="/votacion" 
                className="bg-emerald-700 text-white px-4 py-1.5 rounded-full font-medium text-sm"
              >
                Votar
              </Link>
            </div>
            
          </div>
        </div>
      </nav>

      {/* Main Content (Outlet renders the child routes) */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer corporativo */}
      <footer className="bg-emerald-950 text-emerald-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="https://res.cloudinary.com/lqgq6nsm/image/upload/f_auto,q_auto/image-removebg-preview" 
                alt="Logo La Peca" 
                className="w-12 h-12 object-contain bg-white/10 rounded-lg p-1"
              />
              <span className="font-bold text-xl text-white">La Peca Decide</span>
            </div>
            <p className="text-sm text-emerald-200 leading-relaxed max-w-sm">
              Plataforma oficial de participación ciudadana para el fomento de la cultura, la exportación del café y el desarrollo turístico de nuestro distrito.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-emerald-200 hover:text-white text-sm transition-colors">Inicio</Link></li>
              <li><Link to="/votacion" className="text-emerald-200 hover:text-white text-sm transition-colors">Centro de Votación</Link></li>
              <li><Link to="/transparencia" className="text-emerald-200 hover:text-white text-sm transition-colors">Política de Transparencia</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-sm">Garantía de Proceso</h3>
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-emerald-200">
                Tus votos son verificados con los estándares de RENIEC y asegurados por nuestra tecnología. Un voto, una persona.
              </p>
            </div>
          </div>
          
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-emerald-800 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-emerald-400">
            © {new Date().getFullYear()} Distrito de La Peca - Amazonas. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
