import React from 'react';

const BenefitsGrid = ({ benefits }) => (
  <div className="benefits-grid">
    {benefits.map((item, idx) => (
      <div key={idx} className="benefit-item">
        <div className="benefit-icon">{item.icon}</div>
        <h3>{item.heading}</h3>
        <p>{item.text}</p>
      </div>
    ))}
  </div>
);

export default BenefitsGrid;
