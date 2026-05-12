'use client';

import { useEffect, useState } from 'react';
import { storageLocations, getClassesByCategory, getLocationsByCategory } from '@/lib/storage-locations';

interface Props {
  value: string;
  onChange: (location: string) => void;
  onCategoryChange?: (category: string) => void;
}

export default function StorageLocationSelector({ value, onChange, onCategoryChange }: Props) {
  const [category, setCategory] = useState('');
  const [storageClass, setStorageClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    if (!category) {
      setAvailableClasses([]);
      setAvailableLocations([]);
      setStorageClass('');
      onCategoryChange?.('');
      return;
    }

    const classes = getClassesByCategory(category);
    const locations = getLocationsByCategory(category);
    setAvailableClasses(classes);
    setAvailableLocations(locations);
    setStorageClass('');
    onCategoryChange?.(category);
  }, [category, onCategoryChange]);

  const handleLocationSelect = (location: string) => {
    onChange(location);
  };

  return (
    <div className="storage-selector">
      <div className="form-row">
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            <option value="">Select category...</option>
            {Object.keys(storageLocations).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Storage class</label>
          <select
            value={storageClass}
            onChange={(e) => setStorageClass(e.target.value)}
            className="input"
            disabled={!category}
          >
            <option value="">Select class...</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {category && (
        <div className="storage-map">
          <h4>Storage map</h4>
          <div className="location-grid">
            {availableLocations.map((location) => (
              <div
                key={location}
                className={`location-card ${value === location ? 'selected' : ''}`}
                onClick={() => handleLocationSelect(location)}
              >
                <strong>{location.split(' - ')[0]}</strong>
                <div className="location-details">{location.split(' - ').slice(1).join(' - ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {value && (
        <div className="selected-location">
          <strong>Selected:</strong> {value}
        </div>
      )}
    </div>
  );
}
