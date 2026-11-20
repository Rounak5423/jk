import React from 'react';
import tyreImg from '../../assets/tyres/tyre-critical.jpg';

interface Props { className?: string; }

export const TyreCritical: React.FC<Props> = ({ className }) => (
  <img
    src={tyreImg}
    alt="Critical tyre"
    className={className}
    style={{ objectFit: 'contain', display: 'block' }}
    draggable={false}
  />
);
