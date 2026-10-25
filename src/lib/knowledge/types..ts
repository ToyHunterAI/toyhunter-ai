export type KeywordType =
  | "character"
  | "team"
  | "subgroup"
  | "series"
  | "faction"
  | "manufacturer"
  | "vehicle"
  | "playset"
  | "base"
  | "weapon"
  | "accessory"
  | "combiner"
  | "cassette"
  | "headmaster"
  | "targetmaster"
  | "powermaster"
  | "pretender"
  | "micromaster"
  | "actionmaster"
  | "partner"
  | "alias"
  | "abbreviation"
  | "misspelling";

export type KeywordStatus =
  | "active"
  | "deprecated"
  | "duplicate"
  | "unreleased";

export interface KnowledgeRecord {
  toyline: string;
  keyword: string;
  keyword_type: KeywordType;

  category: string;
  era: string;
  faction: string;

  official_name: string;
  aliases: string;

  weight: number;

  source: string;
  status: KeywordStatus;

  notes: string;
}

export interface ToylineDefinition {
  id: string;
  name: string;
  years: number[];

  manufacturers: string[];

  aliases: string[];

  wikidata?: string;

  enabled: boolean;
}