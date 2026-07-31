import React from 'react';
import './Input.css';

const Input = React.forwardRef(({ label, error, className = '', id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id || `input-${generatedId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
      <input 
        ref={ref}
        id={inputId}
        className={`custom-input ${error ? 'input-error' : ''}`} 
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : props['aria-describedby']}
        {...props} 
      />
      {error && <span className="error-message" id={errorId} role="alert">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
