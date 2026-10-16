import { useCallback, useState } from "react";
import { mockWorkplaces } from "../mocks/entry";
import { usePersons } from "./usePersons";
import type { EntryLine, Person, SetupStep, Workplace } from "../types/entry";
import type { Product } from "../types";

export type EntryPhase = "search" | "quantity";

export const useEntryFlow = () => {
  const [step, setStep] = useState<SetupStep>("person");
  const [person, setPerson] = useState<Person | null>(null);
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [phase, setPhase] = useState<EntryPhase>("search");
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [lines, setLines] = useState<EntryLine[]>([]);

  // ✅ Ambil data pekerja langsung dari Database
  const { persons } = usePersons();

  const wizardData = {
    person: {
      value: person,
      options: persons, // Pakai data dari DB
      placeholder: "Ketik atau pilih nama pekerja...",
      title: "Pilih Nama Pekerja",
    },
    workplace: {
      value: workplace,
      options: mockWorkplaces, // Tetap pakai hardcode lokal
      placeholder: "Ketik atau pilih lokasi pekerjaan...",
      title: "Pilih Lokasi Pekerjaan",
    },
  } as const;

  const currentWizardData =
    step === "done"
      ? { value: null, title: "", placeholder: "", options: [] }
      : wizardData[step as "person" | "workplace"];

  const openWizard = useCallback(() => {
    setStep("person");
    setWizardOpen(true);
  }, []);

  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const selectWizardValue = useCallback(
    (value: Person | Workplace) => {
      if (step === "person") {
        setPerson(value as Person);
        setWorkplace(null);
        setStep("workplace");
      } else if (step === "workplace") {
        setWorkplace(value as Workplace);
        setStep("done");
        setWizardOpen(false);
      }
    },
    [step],
  );

  const resetSession = useCallback(() => {
    setStep("person");
    setPerson(null);
    setWorkplace(null);
    setPhase("search");
    setActiveItem(null);
    setActiveQty(1);
    setLines([]);
    setWizardOpen(false);
  }, []);

  const backWizard = useCallback(() => {
    if (step === "workplace") {
      setWorkplace(null);
      setStep("person");
    }
  }, [step]);

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