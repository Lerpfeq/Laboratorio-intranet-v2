'use client';

import { useEffect, useState } from 'react';

interface CategoryData {
  id: string;
  name: string;
  storageMap: string | null;
}

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
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories from DB on mount
  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-fill storage location when category changes
  useEffect(() => {
    if (!category) {
      onLocationChange('');
      return;
    }
    const match = categories.find((c) => c.name === category);
    if (match?.storageMap) {
      onLocationChange(match.storageMap);
    } else {
      onLocationChange('');
    }
  }, [category, categories, onLocationChange]);

  return (
    <div className="storage-selector">
      <div className="form-group">
        <label>Category</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input"
          disabled={loading}
        >
          <option value="">{loading ? 'Loading categories...' : 'Select category...'}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
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
