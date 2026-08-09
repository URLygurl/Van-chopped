/**
 * Primary button with variants.
 */
import React from 'react';
export function Button({ variant = 'primary', children }) {
  const [hover, setHover] = React.useState(false);
  return <button className={variant} onMouseEnter={() => setHover(true)}>{children}</button>;
}