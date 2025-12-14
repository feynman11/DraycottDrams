import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { FlavorProfile } from '../types';

interface Props {
  data: FlavorProfile;
}

export const FlavorRadar: React.FC<Props> = ({ data }) => {
  const chartData = [
    { subject: 'Peat', A: data.peat, fullMark: 100 },
    { subject: 'Fruit', A: data.fruit, fullMark: 100 },
    { subject: 'Floral', A: data.floral, fullMark: 100 },
    { subject: 'Spice', A: data.spice, fullMark: 100 },
    { subject: 'Wood', A: data.wood, fullMark: 100 },
    { subject: 'Sweet', A: data.sweetness, fullMark: 100 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Flavor"
            dataKey="A"
            stroke="#d97706"
            strokeWidth={2}
            fill="#d97706"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};