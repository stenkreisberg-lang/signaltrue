import React from 'react';
import SiteHeader from '../SiteHeader';
import SiteFooter from '../SiteFooter';

const MarketingLayout = ({ children }) => {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
};

export default MarketingLayout;
