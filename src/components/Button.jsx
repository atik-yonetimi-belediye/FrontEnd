import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', size = 'md', className = '', as: Component = 'button', ...props }) => {
  const componentProps = Component === 'button'
    ? { type: props.type || 'button', ...props }
    : props;

  return (
    <Component
      className={`custom-btn btn-${variant} btn-${size} ${className}`}
      {...componentProps}
    >
      {children}
    </Component>
  );
};

export default Button;
