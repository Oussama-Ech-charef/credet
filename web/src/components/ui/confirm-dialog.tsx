"use client";

import { useEffect, useRef } from "react";
import { Button } from "./button";
import { Icon } from "./icon";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string;
  tone?: "danger" | "primary";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "تأكيد الحذف",
  cancelLabel = "إلغاء",
  loading = false,
  error = "",
  tone = "danger",
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button
            ref={cancelRef}
            disabled={loading}
            onClick={onClose}
            variant="secondary"
          >
            {cancelLabel}
          </Button>
          <Button
            loading={loading}
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-dialog__message">
        <span
          aria-hidden="true"
          className={`confirm-dialog__icon confirm-dialog__icon--${tone}`}
        >
          <Icon name={tone === "danger" ? "trash" : "alert"} size={22} />
        </span>
        <p>{description}</p>
      </div>
      {error ? (
        <p className="confirm-dialog__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
