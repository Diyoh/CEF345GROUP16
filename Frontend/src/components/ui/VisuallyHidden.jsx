import React from 'react';

export const VisuallyHidden = ({ as: Tag = 'span', children, ...props }) => (
  <Tag className="sr-only" {...props}>
    {children}
  </Tag>
);
