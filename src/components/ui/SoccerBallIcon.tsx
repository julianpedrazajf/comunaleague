import React from 'react';
import { Image } from 'react-native';

const soccerBall = require('../../../assets/textures/icons8-soccer-ball-50.png');

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function SoccerBallIcon({ size = 24, color }: Props) {
  return (
    <Image
      source={soccerBall}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
    />
  );
}
