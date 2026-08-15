import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, Package, Check, Shield } from 'lucide-react';
import { api } from '../api/client';
import { Item, ContractTemplate, Agreement, Category, Clause } from '../types';
import { ClauseBuilder } from '../components/ClauseBuilder';

export const OwnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'templates' | 'agreements'>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  // New Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('PROPERTY');
  const [pricingUnit, setPricingUnit] = useState<'HOUR' | 'DAY' | 'WEEK' | 'USE'>('DAY');
  const [basePrice, setBasePrice] = useState(100);
  const [location, setLocation] = useState('Los Angeles, CA');

  // Category specific attribute states
  const [propBeds, setPropBeds] = useState(2);
  const [propBaths, setPropBaths] = useState(2);
  const [propType, setPropType] = useState('Condo');
  const [propSqft, setPropSqft] = useState(1000);

  const [vehMileage, setVehMileage] = useState(15000);
  const [vehFuel, setVehFuel] = useState('ELECTRIC');
  const [vehTrans, setVehTrans] = useState('AUTOMATIC');
  const [vehSeats, setVehSeats] = useState(5);

  const [eqPower, setEqPower] = useState('AC Power');
  const [eqCondition, setEqCondition] = useState('LIKE_NEW');
  const [eqAccessories, setEqAccessories] = useState(true);

  const [appSize, setAppSize] = useState('M');
  const [appGender, setAppGender] = useState('UNISEX');
  const [appColor, setAppColor] = useState('Black');
  const [appMaterial, setAppMaterial] = useState('Silk');

  const [srvExp, setSrvExp] = useState(5);
  const [srvRadius, setSrvRadius] = useState(25);

  // New Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [clauses, setClauses] = useState<Clause[]>([
    { type: 'DEPOSIT', title: 'Security Deposit', params: { amountPercent: 15, refundable: true } },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, tempRes, agrRes] = await Promise.all([
        api.get('/items'),
        api.get('/templates'),
        api.get('/agreements?role=owner'),
      ]);
      setItems(itemsRes.data);
      setTemplates(tempRes.data);
      setAgreements(agrRes.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();

    let attributes: Record<string, any> = {};
    if (category === 'PROPERTY') {
      attributes = { beds: Number(propBeds), baths: Number(propBaths), propertyType: propType, squareFeet: Number(propSqft) };
    } else if (category === 'VEHICLE') {
      attributes = { mileage: Number(vehMileage), fuelType: vehFuel, transmission: vehTrans, seats: Number(vehSeats) };
    } else if (category === 'EQUIPMENT') {
      attributes = { powerSource: eqPower, condition: eqCondition, includesAccessories: eqAccessories };
    } else if (category === 'APPAREL') {
      attributes = { size: appSize, gender: appGender, color: appColor, material: appMaterial };
    } else if (category === 'SERVICE') {
      attributes = { providerExperienceYears: Number(srvExp), includesMaterials: true, serviceRadiusMiles: Number(srvRadius) };
    }

    try {
      await api.post('/items', {
        title,
        description,
        category,
        pricingUnit,
        basePrice: Number(basePrice),
        location,
        attributes,
      });
      setShowItemModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create item');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/templates', {
        name: templateName,
        clauses,
      });
      setShowTemplateModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create template');
    }
  };

  const handleAcceptAgreement = async (agreementId: string) => {
    try {
      await api.post(`/agreements/${agreementId}/accept`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept agreement');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Owner Management Hub</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your rental catalog, custom legal contract templates, and incoming bookings.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowTemplateModal(true)}>
            <FileText size={16} /> + New Contract Template
          </button>
          <button className="btn btn-primary" onClick={() => setShowItemModal(true)}>
            <PlusCircle size={16} /> + Create Rental Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
          My Listed Items ({items.length})
        </button>
        <button className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
          Contract Templates ({templates.length})
        </button>
        <button className={`tab-btn ${activeTab === 'agreements' ? 'active' : ''}`} onClick={() => setActiveTab('agreements')}>
          Incoming Agreements & Escrow ({agreements.length})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <p>Loading owner dashboard data...</p>
      ) : activeTab === 'items' ? (
        <div className="grid-cards">
          {items.map((item) => (
            <div key={item.id} className="glass-card">
              <span className="badge badge-property" style={{ marginBottom: '0.5rem' }}>{item.category}</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{item.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>{item.description}</p>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                ${item.basePrice} / {item.pricingUnit.toLowerCase()}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'templates' ? (
        <div className="grid-cards">
          {templates.map((tpl) => (
            <div key={tpl.id} className="glass-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{tpl.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {tpl.clauses.length} Composable Legal Clauses
              </p>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#c7d2fe' }}>
                {tpl.clauses.map((c, i) => (
                  <div key={i}>• {c.title} ({c.type})</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {agreements.map((agr) => (
            <div key={agr.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className={`badge badge-${agr.status.toLowerCase()}`} style={{ marginBottom: '0.4rem' }}>
                  {agr.status} • Escrow: {agr.escrowState}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{agr.item?.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Renter: {agr.renter?.name} | Value: ${agr.totalAmount.toFixed(2)}
                </p>
              </div>

              <div>
                {agr.status === 'PENDING_ACCEPTANCE' && (
                  <button className="btn btn-success" onClick={() => handleAcceptAgreement(agr.id)}>
                    <Check size={16} /> Accept & Lock Escrow
                  </button>
                )}
                {agr.status === 'ACTIVE' && (
                  <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                    🔒 Funds Locked in Escrow
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Item */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">List New Rental Item</h3>
              <button className="close-btn" onClick={() => setShowItemModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateItem}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  <option value="PROPERTY">PROPERTY (Real Estate, Villas, Lofts)</option>
                  <option value="VEHICLE">VEHICLE (Cars, EVs, Trucks)</option>
                  <option value="EQUIPMENT">EQUIPMENT (Cameras, Tools, Audio)</option>
                  <option value="APPAREL">APPAREL (Designer wear, Suits, Gowns)</option>
                  <option value="SERVICE">SERVICE (Drone, Photography, Labor)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Item Title</label>
                <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Base Price ($)</label>
                  <input type="number" className="form-control" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Pricing Unit</label>
                  <select className="form-control" value={pricingUnit} onChange={(e) => setPricingUnit(e.target.value as any)}>
                    <option value="HOUR">HOUR</option>
                    <option value="DAY">DAY</option>
                    <option value="WEEK">WEEK</option>
                    <option value="USE">USE</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} required />
                </div>
              </div>

              {/* Dynamic Category Specific Inputs */}
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#a5b4fc' }}>
                  Zod-Validated {category} Specific Attributes
                </h4>

                {category === 'PROPERTY' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                    <input type="number" className="form-control" placeholder="Beds" value={propBeds} onChange={(e) => setPropBeds(Number(e.target.value))} />
                    <input type="number" className="form-control" placeholder="Baths" value={propBaths} onChange={(e) => setPropBaths(Number(e.target.value))} />
                    <input type="text" className="form-control" placeholder="Type" value={propType} onChange={(e) => setPropType(e.target.value)} />
                    <input type="number" className="form-control" placeholder="Sqft" value={propSqft} onChange={(e) => setPropSqft(Number(e.target.value))} />
                  </div>
                )}

                {category === 'VEHICLE' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                    <input type="number" className="form-control" placeholder="Mileage" value={vehMileage} onChange={(e) => setVehMileage(Number(e.target.value))} />
                    <select className="form-control" value={vehFuel} onChange={(e) => setVehFuel(e.target.value)}>
                      <option value="GASOLINE">GASOLINE</option>
                      <option value="ELECTRIC">ELECTRIC</option>
                      <option value="HYBRID">HYBRID</option>
                    </select>
                    <select className="form-control" value={vehTrans} onChange={(e) => setVehTrans(e.target.value)}>
                      <option value="AUTOMATIC">AUTOMATIC</option>
                      <option value="MANUAL">MANUAL</option>
                    </select>
                    <input type="number" className="form-control" placeholder="Seats" value={vehSeats} onChange={(e) => setVehSeats(Number(e.target.value))} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Template */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Contract Template Builder</h3>
              <button className="close-btn" onClick={() => setShowTemplateModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="form-group">
                <label className="form-label">Template Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Standard Property Rental Agreement"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Compose Legal Clauses</label>
                <ClauseBuilder clauses={clauses} onChange={setClauses} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
