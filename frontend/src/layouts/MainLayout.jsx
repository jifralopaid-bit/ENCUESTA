import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = () => {

  return (
    <div className="min-h-screen font-sans flex flex-col bg-gray-50">
      <Header />

      {/* Main Content (Outlet renders the child routes) */}
      <main className="flex-grow">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
