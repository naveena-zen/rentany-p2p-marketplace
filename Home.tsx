import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { Item, Category } from '../types';
import { ItemCard } from '../components/ItemCard';

export const Home: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery) params.query = searchQuery;
      if (location) params.location = location;

      const res = await api.get('/items', { params });
      setItems(res.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  return (
    <div>
      {/* Hero Banner */}
      <div style={{ textAlign: 'center', margin: '1rem 0 3rem 0', position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '1.25rem' }}>
          <Sparkles size={14} /> Trust-Engineered & Escrow-Protected Marketplace
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1rem' }}>
          Rent Anything. <br />
          <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Protected by Smart Contracts & Escrow.
          </span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto 2rem auto' }}>
          List, discover, negotiate, and rent properties, vehicles, cinema equipment, high fashion, and services with immutable contract snapshots and guaranteed escrow.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="form-control"
              placeholder="What do you want to rent?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
            <Filter size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="form-control"
              placeholder="Location (e.g. Los Angeles)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ border: 'none', background: 'transparent' }}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Find Rentals
          </button>
        </form>
      </div>

      {/* Category Pills */}
      <div className="category-pills" style={{ justifyContent: 'center' }}>
        {(['ALL', 'PROPERTY', 'VEHICLE', 'EQUIPMENT', 'APPAREL', 'SERVICE'] as const).map((cat) => (
          <button
            key={cat}
            className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'ALL' ? '🌐 All Categories' : cat === 'PROPERTY' ? '🏡 Properties' : cat === 'VEHICLE' ? '🚗 Vehicles' : cat === 'EQUIPMENT' ? '🎥 Equipment' : cat === 'APPAREL' ? '👔 Apparel' : '⚡ Services'}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>Loading available rental items...</p>
      ) : items.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Shield size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No Rentals Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search criteria or category filter.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
