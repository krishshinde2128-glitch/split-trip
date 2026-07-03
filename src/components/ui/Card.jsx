import React from 'react';
import { cn } from './utils';

export const Card = ({ className, children, ...props }) => {
  return (
    <div className={cn("glass rounded-2xl p-6 shadow-xl", className)} {...props}>
      {children}
    </div>
  );
};
