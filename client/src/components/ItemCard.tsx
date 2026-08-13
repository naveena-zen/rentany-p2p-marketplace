import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Tag, ShieldCheck } from 'lucide-react';
import { Item } from '../types';

interface ItemCardProps {
  item: Item;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'PROPERTY': return 'badge-property';
      case 'VEHICLE': return 'badge-vehicle';
      case 'EQUIPMENT': return 'badge-equipment';
      case 'APPAREL': return 'badge-apparel';
      case 'SERVICE': return 'badge-service';
      default: return 'badge-property';
    }
  };

  const getAttributeSnippet = () => {
    const attr = item.attributes || {};
    if (item.category === 'PROPERTY') {
      return `${attr.beds || 0} Beds • ${attr.baths || 0} Baths • ${attr.squareFeet || 0} sqft`;
    }
    if (item.category === 'VEHICLE') {
      return `${attr.fuelType || 'Gas'} • ${attr.transmission || 'Auto'} • ${attr.seats || 5} Seats`;
    }
    if (item.category === 'EQUIPMENT') {
      return `${attr.condition || 'GOOD'} • Power: ${attr.powerSource || 'N/A'}`;
    }
    if (item.category === 'APPAREL') {
      return `Size: ${attr.size || 'M'} • ${attr.color || ''} • ${attr.material || ''}`;
    }
    if (item.category === 'SERVICE') {
      return `${attr.providerExperienceYears || 1} yrs exp • Radius: ${attr.serviceRadiusMiles || 25}mi`;
    }
    return '';
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className={`badge ${getCategoryBadgeClass(item.category)}`}>
            {item.category}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <MapPin size={13} /> {item.location}
          </span>
        </div>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          {item.title}
        </h3>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.description}
        </p>

        <div style={{ fontSize: '0.8rem', color: '#a5b4fc', background: 'var(--bg-input)', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {getAttributeSnippet()}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              ${item.basePrice}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> / {item.pricingUnit.toLowerCase()}</span>
          </div>

          {item.owner && (
            <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <ShieldCheck size={12} /> {item.owner.name} ({item.owner.trustScore})
            </span>
          )}
        </div>

        <Link to={`/items/${item.id}`} className="btn btn-primary" style={{ width: '100%' }}>
          View Listing & Rent
        </Link>
      </div>
    </div>
  );
};
