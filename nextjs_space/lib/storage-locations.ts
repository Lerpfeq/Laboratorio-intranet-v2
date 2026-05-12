export const storageLocations: Record<string, { classes: string[]; locations: string[] }> = {
  Flammable: {
    classes: ['All'],
    locations: ['CFF - Flammable (all categories)'],
  },
  Acid: {
    classes: ['Acid'],
    locations: ['CAB 1 - SHF 1 - Acid'],
  },
  Corrosive: {
    classes: ['Corrosive (non-acid, non-base)'],
    locations: ['CAB 1 - SHF 2 - Corrosive (non-acid, non-base)'],
  },
  Base: {
    classes: ['Base'],
    locations: ['CAB 2 - SHF 1 - Base'],
  },
  Inorganic: {
    classes: ['Inorganic Salt'],
    locations: ['CAB 2 - SHF 2 - Inorganic Salt'],
  },
  Organic: {
    classes: ['Polymer', 'Thiol', 'Catalyst', 'Crosslinker', 'Photoinitiator', 'Solvent (inert)'],
    locations: ['CAB 3 - SHF 1 - Polymer, Thiol, Catalyst, Crosslinker, Photoinitiator, Solvent (inert)'],
  },
  Reactive: {
    classes: ['Oxidizer', 'Nanomaterial', 'Analytical', 'Monomer'],
    locations: ['CAB 3 - SHF 2 - Oxidizer, Nanomaterial, Analytical, Monomer'],
  },
  Controlled: {
    classes: ['Controlled'],
    locations: ['CAB 4 - SHF 1/2 - Controlled'],
  },
  Microbiology: {
    classes: ['Microbiology'],
    locations: ['CAB 5 - SHF 1/2 - Microbiology'],
  },
  Refrigerated: {
    classes: ['Refrigerated'],
    locations: ['Refrigerator/Freezer - Refrigerated'],
  },
};

export function getClassesByCategory(category: string): string[] {
  return storageLocations[category]?.classes || [];
}

export function getLocationsByCategory(category: string): string[] {
  return storageLocations[category]?.locations || [];
}
