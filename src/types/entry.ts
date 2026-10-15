export interface Team {
  id: string;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  teamId: string;
}

export interface Workplace {
  id: string;
  name: string;
}

export interface EntryLine {
  itemId: number;
  itemName: string;
  unit: string;
  quantity: number;
}

export type SetupStep = "workplace" | "person" | "done";
