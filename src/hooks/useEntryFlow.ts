import { useCallback, useState } from "react";
import { mockPersons, mockWorkplaces } from "../mocks/entry";
import type { EntryLine, Person, SetupStep, Workplace } from "../types";
import type { Product } from "../types";

export type EntryPhase = "search" | "quantity";

export const useEntryFlow = () => {
  // ==========================================
  // Wizard state
  // ==========================================
  const [step, setStep] = useState<SetupStep>("workplace");
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [wizardOpen, setWizardOpen] = useState(true);

  // ==========================================
  // Board state
  // ==========================================
  const [phase, setPhase] = useState<EntryPhase>("search");
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [lines, setLines] = useState<EntryLine[]>([]);

  // ==========================================
  // Wizard data
  // ==========================================
  const wizardData = {
    workplace: {
      value: workplace,
      options: mockWorkplaces,
      placeholder: "Ketik lokasi pekerjaan...",
      title: "Pilih Lokasi Pekerjaan",
    },
    person: {
      value: person,
      options: mockPersons,
      placeholder: "Ketik nama pengambil...",
      title: "Pilih Nama",
    },
  } as const;

  const currentWizardData =
    step === "done"
      ? { value: null, title: "", placeholder: "", options: [] }
      : wizardData[step as "workplace" | "person"];

  // ==========================================
  // Wizard actions
  // ==========================================
  const openWizard = useCallback(() => setWizardOpen(true), []);
  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const selectWizardValue = useCallback(
    (value: Person | Workplace) => {
      if (step === "workplace") {
        setWorkplace(value as Workplace);
        setPerson(null);
        setStep("person");
      } else if (step === "person") {
        setPerson(value as Person);
        setStep("done");
        setWizardOpen(false);
      }
    },
    [step],
  );

  const resetSession = useCallback(() => {
    setStep("workplace");
    setWorkplace(null);
    setPerson(null);
    setPhase("search");
    setActiveItem(null);
    setActiveQty(1);
    setLines([]);
    setWizardOpen(true);
  }, []);

  const backWizard = useCallback(() => {
    if (step === "person") {
      setPerson(null);
      setStep("workplace");
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
    step,
    person,
    workplace,
    currentWizardData,
    selectWizardValue,
    backWizard,
    wizardOpen,
    openWizard,
    closeWizard,
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
    resetSession,
    isReady: step === "done",
  };
};
