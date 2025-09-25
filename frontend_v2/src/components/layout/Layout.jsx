import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {children}
    </div>
  );
};

export default Layout;
