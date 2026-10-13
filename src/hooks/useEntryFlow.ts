import { useCallback, useState } from "react";
import { mockTeams, mockPersons, mockWorkplaces } from "../mocks/entry";
import type { Person, SetupStep, Team, Workplace } from "../types";
import type { EntryLine } from "../types/entry";
import type { Product } from "../types";

export type EntryPhase = "search" | "quantity";

export const useEntryFlow = () => {
  // ==========================================
  // Wizard state
  // ==========================================
  const [step, setStep] = useState<SetupStep>("team");
  const [team, setTeam] = useState<Team | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [workplace, setWorkplace] = useState<Workplace | null>(null);

  // ==========================================
  // Board state
  // ==========================================
  const [phase, setPhase] = useState<EntryPhase>("search");
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [lines, setLines] = useState<EntryLine[]>([]);

  // ==========================================
  // Wizard actions
  // ==========================================
  const wizardData = {
    team: {
      value: team,
      options: mockTeams,
      placeholder: "Ketik nama tim...",
      title: "Pilih Tim",
    },
    person: {
      value: person,
      options: mockPersons.filter((p) => (team ? p.teamId === team.id : true)),
      placeholder: "Ketik nama orang...",
      title: "Pilih Orang",
    },
    workplace: {
      value: workplace,
      options: mockWorkplaces,
      placeholder: "Ketik nama tempat...",
      title: "Pilih Tempat Kerja",
    },
  } as const;

  // ✅ FIX: guard saat step === "done"
  const currentWizardData =
    step === "done"
      ? { value: null, title: "", placeholder: "", options: [] }
      : wizardData[step as "team" | "person" | "workplace"];

  const selectWizardValue = useCallback(
    (value: Team | Person | Workplace) => {
      if (step === "team") {
        setTeam(value as Team);
        setPerson(null);
        setStep("person");
      } else if (step === "person") {
        setPerson(value as Person);
        setStep("workplace");
      } else if (step === "workplace") {
        setWorkplace(value as Workplace);
        setStep("done");
      }
    },
    [step],
  );

  const resetSession = useCallback(() => {
    setStep("team");
    setTeam(null);
    setPerson(null);
    setWorkplace(null);
    setPhase("search");
    setActiveItem(null);
    setActiveQty(1);
    setLines([]);
  }, []);

  const backWizard = useCallback(() => {
    if (step === "person") {
      setPerson(null);
      setStep("team");
    } else if (step === "workplace") {
      setWorkplace(null);
      setStep("person");
    }
  }, [step]);

  // ==========================================
  // Board actions
  // ==========================================
  const selectItem = useCallback((item: Product) => {
    setActiveItem(item);
    setActiveQty(1);
    setPhase("quantity");
  }, []);

  const confirmQuantity = useCallback(() => {
    if (!activeItem) return;
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === activeItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + activeQty };
        return copy;
      }
      return [
        ...prev,
        {
          itemId: activeItem.id,
          itemName: activeItem.name,
          unit: activeItem.unit,
          quantity: activeQty,
        },
      ];
    });
    setActiveItem(null);
    setActiveQty(1);
    setPhase("search");
  }, [activeItem, activeQty]);

  const cancelQuantity = useCallback(() => {
    setActiveItem(null);
    setActiveQty(1);
    setPhase("search");
  }, []);

  const removeLine = useCallback((itemId: number) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const increaseQty = useCallback(() => setActiveQty((q) => q + 1), []);
  const decreaseQty = useCallback(
    () => setActiveQty((q) => Math.max(1, q - 1)),
    [],
  );

  return {
    // wizard
    step,
    team,
    person,
    workplace,
    currentWizardData,
    selectWizardValue,
    backWizard,
    // board
    phase,
    activeItem,
    activeQty,
    lines,
    selectItem,
    confirmQuantity,
    cancelQuantity,
    increaseQty,
    decreaseQty,
    setActiveQty,
    removeLine,
    // session
    resetSession,
    isReady: step === "done",
  };
};
