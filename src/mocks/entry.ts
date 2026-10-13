import type { Team, Person, Workplace } from "../types/entry";

export const mockTeams: Team[] = [
  { id: "t1", name: "Tim Alpha" },
  { id: "t2", name: "Tim Bravo" },
  { id: "t3", name: "Tim Charlie" },
  { id: "t4", name: "Tim Delta" },
];

export const mockPersons: Person[] = [
  { id: "p1", name: "Budi Santoso", teamId: "t1" },
  { id: "p2", name: "Ani Wijaya", teamId: "t1" },
  { id: "p3", name: "Citra Dewi", teamId: "t2" },
  { id: "p4", name: "Dedi Kurniawan", teamId: "t2" },
  { id: "p5", name: "Eka Prasetyo", teamId: "t3" },
  { id: "p6", name: "Fani Lestari", teamId: "t3" },
  { id: "p7", name: "Gunawan Putra", teamId: "t4" },
];

export const mockWorkplaces: Workplace[] = [
  { id: "w1", name: "Gudang A" },
  { id: "w2", name: "Gudang B" },
  { id: "w3", name: "Workshop 1" },
  { id: "w4", name: "Workshop 2" },
  { id: "w5", name: "Ruang Produksi" },
  { id: "w6", name: "Area Packing" },
];
