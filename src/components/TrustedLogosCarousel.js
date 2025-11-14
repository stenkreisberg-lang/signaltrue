import React from 'react';

const TrustedLogosCarousel = ({ logos }) => (
  <div className="trusted-logos-carousel">
    {logos.map((logo, idx) => (
      <img key={idx} src={logo.src} alt={logo.alt} className="trusted-logo" />
    ))}
  </div>
);

export default TrustedLogosCarousel;
