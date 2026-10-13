import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import { SetupWizard } from "../../components/entry/SetupWizard";
import { EntryBoard } from "../../components/entry/EntryBoard";
import { useEntryFlow } from "../../hooks/useEntryFlow";

export const EntryPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const flow = useEntryFlow();

  const handleFinish = async () => {
    // TODO: simpan ke Supabase
    message.success(
      `Tersimpan: ${flow.lines.length} jenis barang di ${flow.workplace?.name}`,
    );
    flow.resetSession();
    navigate("/dashboard");
  };

  return (
    <>
      {/* FASE 1: Wizard */}
      <SetupWizard
        open={!flow.isReady}
        step={flow.step as "team" | "person" | "workplace"}
        title={flow.currentWizardData.title}
        placeholder={flow.currentWizardData.placeholder}
        options={flow.currentWizardData.options}
        onSelect={flow.selectWizardValue}
        onBack={flow.step !== "team" ? flow.backWizard : undefined}
      />

      {/* FASE 2: Board */}
      {flow.isReady && flow.team && flow.person && flow.workplace && (
        <EntryBoard
          team={flow.team}
          person={flow.person}
          workplace={flow.workplace}
          phase={flow.phase}
          activeItem={flow.activeItem}
          activeQty={flow.activeQty}
          lines={flow.lines}
          onSelectItem={flow.selectItem}
          onConfirmQuantity={flow.confirmQuantity}
          onCancelQuantity={flow.cancelQuantity}
          onIncreaseQty={flow.increaseQty}
          onDecreaseQty={flow.decreaseQty}
          onRemoveLine={flow.removeLine}
          onFinish={handleFinish}
        />
      )}
    </>
  );
};

export default EntryPage;
