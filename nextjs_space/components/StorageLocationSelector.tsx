'use client';

import { useEffect } from 'react';
import { categories, storageMap } from '@/lib/storage-locations';

interface Props {
  category: string;
  onCategoryChange: (category: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
}

export default function StorageLocationSelector({
  category,
  onCategoryChange,
  location,
  onLocationChange,
}: Props) {
  useEffect(() => {
    if (category && storageMap[category]) {
      onLocationChange(storageMap[category]);
      return;
    }

    onLocationChange('');
  }, [category, onLocationChange]);

  return (
    <div className="storage-selector">
      <div className="form-group">
        <label>Category</label>
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)} className="input">
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {category && location && (
        <div className="storage-location-result">
          <strong>Storage Location:</strong>
          <div className="location-badge">{location}</div>
        </div>
      )}
    </div>
  );
}
