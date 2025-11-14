import React from 'react';

const HeroSection = ({ headline, subheadline, ctaText, ctaLink }) => (
  <section className="hero-section">
    <h1>{headline}</h1>
    <p>{subheadline}</p>
    <a href={ctaLink} className="cta-btn">{ctaText}</a>
  </section>
);

export default HeroSection;
