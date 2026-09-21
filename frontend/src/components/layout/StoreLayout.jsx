import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toast } from '../common/Toast';

export const StoreLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <Toast />
    </div>
  );
};
