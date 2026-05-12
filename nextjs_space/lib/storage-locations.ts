export const storageMap: Record<string, string> = {
  Flammable: 'CFF - Flammable (all categories)',
  Acid: 'CAB 1 — SHF 1 - Acid',
  Corrosive: 'CAB 1 — SHF 2 - Corrosive (non-acid, non-base)',
  Base: 'CAB 2 — SHF 1 - Base',
  'Inorganic Salt': 'CAB 2 — SHF 2 - Inorganic Salt',
  Polymer: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)',
  Thiol: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)',
  Catalyst: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)',
  Crosslinker: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)',
  Photoinitiator: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)',
  'Solvent (inert)': 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)',
  Oxidizer: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',
  Nanomaterial: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',
  Analytical: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',
  Monomer: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',
  Controlled: 'CAB 4 — SHF 1/2 - Controlled',
  Microbiology: 'CAB 5 — SHF 1/2 - Microbiology',
  Refrigerated: 'Refrigerator/Freezer - Refrigerated',
};

export const categories = Object.keys(storageMap);
