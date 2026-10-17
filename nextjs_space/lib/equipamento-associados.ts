// Associações de equipamentos são simétricas: a relação implícita do Prisma é
// direcional (equipamentosAssociados / associadoPor), então unimos os dois lados
// para que o vínculo apareça em ambos os equipamentos, mesmo para dados antigos
// que foram cadastrados em apenas um sentido.
type Assoc = { id: string; nome: string };

export function mesclarAssociados<
  T extends { id: string; equipamentosAssociados?: Assoc[]; associadoPor?: Assoc[] }
>(eq: T): Omit<T, 'associadoPor'> {
  const { associadoPor = [], ...resto } = eq;
  const mapa = new Map<string, Assoc>();
  for (const a of [...(eq.equipamentosAssociados || []), ...associadoPor]) {
    if (a.id !== eq.id) mapa.set(a.id, a);
  }
  return {
    ...resto,
    equipamentosAssociados: Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome)),
  } as Omit<T, 'associadoPor'>;
}

export const assocSelect = {
  equipamentosAssociados: { select: { id: true, nome: true } },
  associadoPor: { select: { id: true, nome: true } },
} as const;
