import React from 'react';
import tyreImg from '../../assets/tyres/tyre-warning.jpg';

interface Props { className?: string; }

export const TyreWarning: React.FC<Props> = ({ className }) => (
  <img
    src={tyreImg}
    alt="Warning tyre"
    className={className}
    style={{ objectFit: 'contain', display: 'block' }}
    draggable={false}
  />
);
