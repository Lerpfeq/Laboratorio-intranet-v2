# Configuração Completa - LERP Intranet
## 18 Categorias de Reagentes + 10 Localizações

---

## 📦 CATEGORIAS DE REAGENTES (18)

| #  | Categoria          | Letra | Código Interno | Local de Armazenamento Padrão                                                        |
|----|--------------------|:-----:|----------------|--------------------------------------------------------------------------------------|
| 1  | Flammable          | U     | LERP-U####     | CFF - Flammable (all categories)                                                     |
| 2  | Acid               | A     | LERP-A####     | CAB 1 — SHF 1 - Acid                                                                |
| 3  | Corrosive          | U     | LERP-U####     | CAB 1 — SHF 2 - Corrosive (non-acid, non-base)                                      |
| 4  | Base               | B     | LERP-B####     | CAB 2 — SHF 1 - Base                                                                |
| 5  | Inorganic Salt     | I     | LERP-I####     | CAB 2 — SHF 2 - Inorganic Salt                                                      |
| 6  | Polymer            | P     | LERP-P####     | CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)    |
| 7  | Thiol              | T     | LERP-T####     | CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)    |
| 8  | Catalyst           | C     | LERP-C####     | CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)    |
| 9  | Crosslinker        | X     | LERP-X####     | CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)    |
| 10 | Photoinitiator     | F     | LERP-F####     | CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)    |
| 11 | Solvent (inert)    | S     | LERP-S####     | CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)    |
| 12 | Oxidizer / Reducer | O     | LERP-O####     | CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer                            |
| 13 | Nanomaterial       | N     | LERP-N####     | CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer                            |
| 14 | Analytical         | L     | LERP-L####     | CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer                            |
| 15 | Monomer            | M     | LERP-M####     | CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer                            |
| 16 | Controlled         | K     | LERP-K####     | CAB 4 — SHF 1/2 - Controlled                                                        |
| 17 | Microbiology       | G     | LERP-G####     | CAB 5 — SHF 1/2 - Microbiology                                                      |
| 18 | Refrigerated       | U     | LERP-U####     | Refrigerator/Freezer - Refrigerated                                                  |

> **Nota:** `####` = 4 dígitos aleatórios gerados automaticamente (ex: LERP-A1234)

---

## 📍 LOCALIZAÇÕES DE ARMAZENAMENTO (10)

| #  | Nome                 | Descrição                                     | Tipo         |
|----|----------------------|-----------------------------------------------|-------------|
| 1  | CFF                  | Flammable Storage Cabinet                     | Fume Hood    |
| 2  | CAB 1 — SHF 1        | Cabinet 1, Shelf 1 — Acids                    | Cabinet      |
| 3  | CAB 1 — SHF 2        | Cabinet 1, Shelf 2 — Corrosive                | Cabinet      |
| 4  | CAB 2 — SHF 1        | Cabinet 2, Shelf 1 — Bases                    | Cabinet      |
| 5  | CAB 2 — SHF 2        | Cabinet 2, Shelf 2 — Inorganic Salts          | Cabinet      |
| 6  | CAB 3 — SHF 1        | Cabinet 3, Shelf 1 — Polymers/Catalysts/etc.  | Cabinet      |
| 7  | CAB 3 — SHF 2        | Cabinet 3, Shelf 2 — Oxidizers/Monomers/etc.  | Cabinet      |
| 8  | CAB 4 — SHF 1/2      | Cabinet 4 — Controlled Substances             | Cabinet      |
| 9  | CAB 5 — SHF 1/2      | Cabinet 5 — Microbiology                      | Cabinet      |
| 10 | Refrigerator/Freezer | Laboratory Refrigerator / Freezer             | Refrigerator |

---

## 🗺️ MAPEAMENTO POR ARMÁRIO

### CFF (Capela de Exaustão)
- Flammable

### CAB 1 — Armário 1
- **SHF 1** (Prateleira 1): Acid
- **SHF 2** (Prateleira 2): Corrosive

### CAB 2 — Armário 2
- **SHF 1** (Prateleira 1): Base
- **SHF 2** (Prateleira 2): Inorganic Salt

### CAB 3 — Armário 3
- **SHF 1** (Prateleira 1): Polymer, Thiol, Catalyst, Crosslinker, Photoinitiator, Solvent (inert)
- **SHF 2** (Prateleira 2): Oxidizer / Reducer, Nanomaterial, Analytical, Monomer

### CAB 4 — Armário 4
- **SHF 1/2**: Controlled

### CAB 5 — Armário 5
- **SHF 1/2**: Microbiology

### Refrigerator/Freezer
- Refrigerated

---

## 📋 Como Gerenciar

Acesse: **Admin → Categories & Storage Settings** (`/admin/settings`)

- **Adicionar/Editar/Remover** categorias e localizações dinamicamente
- O campo **"Letter"** define a letra do código interno (LERP-{letter}{4digits})
- O campo **"Default Storage Location"** define o preenchimento automático no formulário

---

## 🔄 Re-executar Seed

Para restaurar todos os dados originais:
```bash
npx tsx prisma/seed-complete-data.ts
```

---

**Data:** Maio 2026
**Sistema:** LERP Intranet v2
**Laboratório:** LERP — FEQ/UNICAMP
