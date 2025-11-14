import React from 'react';
import './CTAButton.css';

const CTAButton = ({ text, onClick, href, children, ...props }) => {
  if (href) {
    return (
      <a href={href} className="cta-btn btn-primary" onClick={onClick} {...props}>
        {text || children}
      </a>
    );
  }
  return (
    <button className="cta-btn btn-primary" onClick={onClick} {...props}>
      {text || children}
    </button>
  );
};

export default CTAButton;
