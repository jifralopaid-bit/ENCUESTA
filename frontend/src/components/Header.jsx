import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleVoteClick = (e) => {
    if (location.pathname === '/votacion') {
      e.preventDefault();
      document.getElementById('candidatos-list')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="flex justify-between items-center px-4 py-3 max-w-5xl mx-auto">
        {/* Lado Izquierdo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src="https://res.cloudinary.com/lqgq6nsm/image/upload/v1787301328/image-removebg-preview.png" 
            alt="Logo La Peca Decide" 
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="font-bold text-gray-900 text-lg sm:text-xl tracking-tight">
            La Peca <span className="text-[#035c43]">Decide</span>
          </span>
        </Link>
        
        {/* Lado Derecho */}
        <Link 
          to="/votacion"
          onClick={handleVoteClick}
          className="bg-[#035c43] text-white font-bold px-6 py-2 rounded-md hover:scale-105 transition-transform"
        >
          VOTAR
        </Link>
      </div>
    </header>
  );
};

export default Header;
