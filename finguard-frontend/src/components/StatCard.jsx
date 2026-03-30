import React from 'react';

export default function StatCard({ title, value, subtitle, change, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div>
          <p className="stat-title">{title}</p>
          <h2 className="stat-value">{value}</h2>
          <p className="stat-sub">{subtitle}</p>
        </div>

        <div className={`stat-icon ${color}`}>
          {icon}
        </div>
      </div>

      {/* <div className={`stat-change ${change.startsWith("+") ? "positive" : "negative"}`}>
        {change} vs yesterday
      </div> */}
    </div>
  );
}