import React, { useState } from "react";
import toast from "react-hot-toast";
import EntityPill from "components/EntityPill";
import { practiceErrorLogService } from "services/api";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { formatDateTimeInTimeZone } from "services/dateTimeService";

function StudentAssetIssueSection({ session, incidentCategories = [], userTimeZoneId, onIssueReported }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    errorType: "",
    studentDescription: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!session?.sessionID || !formData.studentDescription.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await practiceErrorLogService.create({
        sessionID: Number(session.sessionID),
        errorTime: new Date().toISOString(),
        errorType: formData.errorType || undefined,
        studentDescription: formData.studentDescription.trim(),
        instructorNotified: true,
      });

      setFormData({ errorType: "", studentDescription: "" });
      toast.success(t(K.STUDENT_ISSUE_REPORTED, "Issue reported successfully."));
      if (typeof onIssueReported === "function") {
        onIssueReported();
      }
    } catch (error) {
      toast.error(`${t(K.STUDENT_ISSUE_REPORT_FAILED, "Issue report failed")}: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-navy-700 dark:text-white">
        {t(K.STUDENT_REPORT_ISSUE_TITLE, "Report an Issue")}
      </h4>

      {session?.sessionID ? (
        <>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
            {t(K.STUDENT_SESSION_ROW, "Session")} #{session.sessionID}
            {session.startTime ? ` • ${t(K.STUDENT_SESSION_INFO, "Start")} ${formatDateTimeInTimeZone(session.startTime, userTimeZoneId)}` : ""}
          </p>

          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <select
              value={formData.errorType}
              onChange={(event) => setFormData((prev) => ({ ...prev, errorType: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.INCIDENT_SELECT_CATEGORY, "Select incident category")}</option>
              {incidentCategories.map((category) => (
                <option key={category.itemCode} value={category.itemCode}>{category.label}</option>
              ))}
            </select>

            <textarea
              required
              rows={4}
              value={formData.studentDescription}
              onChange={(event) => setFormData((prev) => ({ ...prev, studentDescription: event.target.value }))}
              placeholder={t(K.STUDENT_DESCRIBE_EVENT, "Describe what happened")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />

            <button
              type="submit"
              disabled={submitting || !formData.studentDescription.trim()}
              className="w-full rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              {t(K.STUDENT_SUBMIT_ISSUE, "Submit Issue")}
            </button>
          </form>
        </>
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
          {t(K.STUDENT_NO_OPEN_SESSION, "No active session on this asset.")}
        </p>
      )}
    </div>
  );
}

export const buildStudentAssignedAssetModalData = ({
  assignment = null,
  session = null,
  incidentCategories = [],
  userTimeZoneId,
  onIssueReported,
}) => ({
  serialNumber: assignment?.serialNumber || null,
  assetStatus: assignment?.assetStatus || null,
  renderExtraContent: () => (
    <StudentAssetIssueSection
      session={session}
      incidentCategories={incidentCategories}
      userTimeZoneId={userTimeZoneId}
      onIssueReported={onIssueReported}
    />
  ),
});

export default function StudentAssignedAssetPill({
  assetId,
  label,
  assignment = null,
  session = null,
  incidentCategories = [],
  userTimeZoneId,
  onIssueReported,
}) {
  if (!assetId) {
    return null;
  }

  return (
    <EntityPill
      type="asset"
      id={assetId}
      label={label}
      modalData={buildStudentAssignedAssetModalData({
        assignment,
        session,
        incidentCategories,
        userTimeZoneId,
        onIssueReported,
      })}
    />
  );
}