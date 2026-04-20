import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function DonutChart({ title, data, colors }) {
  return (
    <div className="chart-container">
      <h3 className="panel-title">{title}</h3>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '4px' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {data.map((entry, index) => (
           <div key={index} className="legend-item">
             <span className="legend-dot" style={{ backgroundColor: colors[index % colors.length] }}></span>
             <span className="legend-label">{entry.name}</span>
           </div>
        ))}
      </div>
    </div>
  );
}
