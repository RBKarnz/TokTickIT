import React from 'react';

export const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'LOW': 
      return <span className="badge" style={{ backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>LOW</span>;
    case 'MEDIUM': 
      return <span className="badge" style={{ backgroundColor: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA' }}>MEDIUM</span>;
    case 'HIGH': 
      return <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>HIGH</span>;
    case 'CRITICAL': 
      return <span className="badge" style={{ backgroundColor: '#991B1B', color: '#FEF2F2', border: '1px solid #7F1D1D' }}>CRITICAL</span>;
    default: 
      return <span className="badge bg-secondary">{priority}</span>;
  }
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'NEW': 
      return <span className="badge" style={{ backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}>NEW</span>;
    case 'OPEN': 
      return <span className="badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>OPEN</span>;
    case 'IN_PROGRESS': 
      return <span className="badge" style={{ backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' }}>IN PROGRESS</span>;
    case 'RESOLVED': 
      return <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>RESOLVED</span>;
    case 'CLOSED': 
      return <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>CLOSED</span>;
    default: 
      return <span className="badge bg-dark">{status}</span>;
  }
};
