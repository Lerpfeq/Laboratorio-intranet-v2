export const CLASSE_RESIDUO_VALUES = [
  "HC",
  "OH",
  "CN",
  "CS",
  "OF",
  "OM",
  "INORGANICO",
] as const;

export const ESTADO_RESIDUO_VALUES = ["S", "L"] as const;

export type ClasseResiduoValue = (typeof CLASSE_RESIDUO_VALUES)[number];
export type EstadoResiduoValue = (typeof ESTADO_RESIDUO_VALUES)[number];

export const CLASSE_RESIDUO_LABEL: Record<ClasseResiduoValue, string> = {
  HC: "HC",
  OH: "OH",
  CN: "CN",
  CS: "CS",
  OF: "OF",
  OM: "OM",
  INORGANICO: "Inorgânico",
};

export interface ResiduoPayload {
  composicao: string;
  classe: ClasseResiduoValue;
  estado: EstadoResiduoValue;
  tipoRecipiente: string;
  volumeRecipienteLitros: number;
  responsavel: string;
  departamento: string;
  data?: string;
  ph?: number | null;
  observacoes?: string;
  halogenadosPercentual?: number | null;
  acetonitrilaPercentual?: number | null;
  metaisPesadosPercentual?: number | null;
  presencaEnxofre?: boolean;
  geradorCianetos?: boolean;
  aminas?: boolean;
}

export interface CampanhaItemPayload {
  id: string;
  volumeAtualLitros: number;
}

export interface CampanhaPayload {
  departamento?: string;
  responsavelInformacoes?: string;
  data?: string;
  itens: CampanhaItemPayload[];
}
