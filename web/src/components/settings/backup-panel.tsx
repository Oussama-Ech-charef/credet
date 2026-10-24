"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { api, apiErrorMessage, saveBlob } from "@/lib/api";

export function BackupPanel() {
  const { toast } = useToast();
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [jsonLoading, setJsonLoading] = useState(false);

  async function handleDatabaseBackup() {
    setDatabaseLoading(true);

    try {
      const file = await api.downloadDatabase();
      saveBlob(file.blob, file.filename);
      toast("تم تنزيل نسخة قاعدة البيانات.");
    } catch (error) {
      toast(apiErrorMessage(error), "error");
    } finally {
      setDatabaseLoading(false);
    }
  }

  async function handleJsonExport() {
    setJsonLoading(true);

    try {
      const file = await api.exportJson();
      saveBlob(file.blob, file.filename);
      toast("تم تصدير بيانات الكليان والحركات بصيغة JSON.");
    } catch (error) {
      toast(apiErrorMessage(error), "error");
    } finally {
      setJsonLoading(false);
    }
  }

  return (
    <section aria-labelledby="backup-title" className="settings-card">
      <header className="settings-card__header">
        <h2 className="settings-card__title" id="backup-title">
          النسخ الاحتياطي
        </h2>
        <p className="settings-card__description">
          احتفظ بنسخة من الدفتر في مكان آمن. التنزيل يقرأ قاعدة البيانات الحالية
          دون إيقاف العمل.
        </p>
      </header>

      <div className="backup-list">
        <div className="backup-row">
          <span aria-hidden="true" className="backup-row__icon">
            <Icon name="database" size={19} />
          </span>
          <div className="backup-row__copy">
            <strong>نسخة SQLite كاملة (.db)</strong>
            <span>
              تشمل الكليان والحركات والإعدادات. مناسبة للحفظ طويل الأمد أو النقل
              إلى جهاز آخر.
            </span>
          </div>
          <div className="backup-row__action">
            <Button
              icon="download"
              loading={databaseLoading}
              onClick={() => void handleDatabaseBackup()}
              size="sm"
              variant="outline"
            >
              تنزيل النسخة
            </Button>
          </div>
        </div>

        <div className="backup-row">
          <span
            aria-hidden="true"
            className="backup-row__icon backup-row__icon--json"
          >
            <Icon name="file-json" size={19} />
          </span>
          <div className="backup-row__copy">
            <strong>تصدير JSON</strong>
            <span>
              ملف نصي يضم الكليان وكل الحركات، مناسب للقراءة أو المعالجة خارج
              التطبيق.
            </span>
          </div>
          <div className="backup-row__action">
            <Button
              icon="download"
              loading={jsonLoading}
              onClick={() => void handleJsonExport()}
              size="sm"
              variant="secondary"
            >
              تصدير JSON
            </Button>
          </div>
        </div>
      </div>

      <p className="settings-note">
        <Icon name="alert" size={15} />
        <span>
          الاسترجاع التلقائي غير متاح في هذه المرحلة. احفظ النسخ في مكان آمن
          قبل أي تغيير كبير على الجهاز.
        </span>
      </p>
    </section>
  );
}
