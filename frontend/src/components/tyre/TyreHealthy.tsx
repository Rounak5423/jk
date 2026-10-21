import React from 'react';
import tyreImg from '../../assets/tyres/tyre-healthy.png.png';

interface Props { className?: string; }

export const TyreHealthy: React.FC<Props> = ({ className }) => (
  <img
    src={tyreImg}
    alt="Healthy tyre"
    className={className}
    style={{ objectFit: 'contain', display: 'block' }}
    draggable={false}
  />
);
