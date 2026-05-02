import React, { useEffect, useMemo, useState } from "react";
import Card from "components/card";
import {
  getAllUsers,
  assignRole,
  removeRole,
} from "services/userService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const PORTAL_ROLE_MAPPINGS = [
  { id: "student", translationKey: K.PORTAL_STUDENT_NAME, label: "Student Portal", role: "Student" },
  { id: "teacher", translationKey: K.PORTAL_TEACHER_NAME, label: "Teacher Portal", role: "Instructor" },
  { id: "maintainer", translationKey: K.PORTAL_MAINTAINER_NAME, label: "Technician Portal", role: "Technician" },
];

const getRoleInfo = (user, role) => {
  if (role === "Student") return user.studentRole;
  if (role === "Instructor") return user.instructorRole;
  if (role === "Technician") return user.technicianRole;
  return null;
};

const hasActiveRole = (user, role) => {
  const roleInfo = getRoleInfo(user, role);
  if (!roleInfo) return false;
  return roleInfo.isActive !== false;
};

export default function PortalAccessManagement() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedPortalId, setSelectedPortalId] = useState(PORTAL_ROLE_MAPPINGS[0].id);
  const [submitting, setSubmitting] = useState(false);

  const selectedPortal = useMemo(
    () => PORTAL_ROLE_MAPPINGS.find((item) => item.id === selectedPortalId) || PORTAL_ROLE_MAPPINGS[0],
    [selectedPortalId]
  );

  const selectedCount = selectedUsers.size;
  const allSelected = users.length > 0 && users.every((user) => selectedUsers.has(user.userID));

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data || []);
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert(t(K.PORTAL_ACCESS_FETCH_FAILED, "Failed to fetch users: {error}").replace("{error}", error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedUsers(new Set());
      return;
    }

    setSelectedUsers(new Set(users.map((user) => user.userID)));
  };

  const toggleUser = (userId) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const processBulk = async (mode) => {
    if (selectedCount === 0) {
      alert(t(K.PORTAL_ACCESS_SELECT_USER, "Please select at least one user."));
      return;
    }

    const targetUsers = users.filter((user) => selectedUsers.has(user.userID));
    const portalLabel = t(selectedPortal.translationKey, selectedPortal.label);

    const usersToProcess = targetUsers.filter((user) => {
      const active = hasActiveRole(user, selectedPortal.role);
      return mode === "grant" ? !active : active;
    });

    if (usersToProcess.length === 0) {
      alert(
        mode === "grant"
          ? t(K.PORTAL_ACCESS_ALREADY_GRANTED, "All selected users already have {portal} access.").replace("{portal}", portalLabel)
          : t(K.PORTAL_ACCESS_NONE_TO_REVOKE, "None of the selected users currently have {portal} access.").replace("{portal}", portalLabel)
      );
      return;
    }

    const confirmed = window.confirm(
      mode === "grant"
        ? t(K.PORTAL_ACCESS_CONFIRM_GRANT, "Grant {portal} for {count} user(s)?").replace("{portal}", portalLabel).replace("{count}", usersToProcess.length)
        : t(K.PORTAL_ACCESS_CONFIRM_REVOKE_BULK, "Revoke {portal} for {count} user(s)?").replace("{portal}", portalLabel).replace("{count}", usersToProcess.length)
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);

      const results = await Promise.allSettled(
        usersToProcess.map((user) =>
          mode === "grant"
            ? assignRole(user.userID, selectedPortal.role, null)
            : removeRole(user.userID, selectedPortal.role)
        )
      );

      const failed = results.filter((item) => item.status === "rejected");
      const successCount = results.length - failed.length;

      if (failed.length === 0) {
        alert(
          mode === "grant"
            ? t(K.PORTAL_ACCESS_GRANTED, "Granted {portal} for {count} user(s).").replace("{portal}", portalLabel).replace("{count}", successCount)
            : t(K.PORTAL_ACCESS_REVOKED, "Revoked {portal} for {count} user(s).").replace("{portal}", portalLabel).replace("{count}", successCount)
        );
      } else {
        alert(
          mode === "grant"
            ? t(K.PORTAL_ACCESS_PARTIAL_GRANT, "Granted {portal} for {count} user(s). {failed} user(s) failed. Check console for details.").replace("{portal}", portalLabel).replace("{count}", successCount).replace("{failed}", failed.length)
            : t(K.PORTAL_ACCESS_PARTIAL_REVOKE, "Revoked {portal} for {count} user(s). {failed} user(s) failed. Check console for details.").replace("{portal}", portalLabel).replace("{count}", successCount).replace("{failed}", failed.length)
        );
        console.error("Portal access bulk operation failures:", failed);
      }

      await fetchUsers();
    } catch (error) {
      console.error("Bulk portal access operation failed:", error);
      alert(t(K.PORTAL_ACCESS_BULK_FAILED, "Bulk operation failed: {error}").replace("{error}", error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleGrant = async (user, role, portalKey, portalFallback) => {
    const portalLabel = t(portalKey, portalFallback);
    try {
      await assignRole(user.userID, role, null);
      alert(t(K.PORTAL_ACCESS_GRANT_SUCCESS, "Granted {portal} successfully.").replace("{portal}", portalLabel));
      await fetchUsers();
    } catch (error) {
      console.error("Grant portal access failed:", error);
      alert(t(K.PORTAL_ACCESS_GRANT_FAILED, "Grant failed: {error}").replace("{error}", error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")));
    }
  };

  const handleSingleRevoke = async (user, role, portalKey, portalFallback) => {
    const portalLabel = t(portalKey, portalFallback);
    if (!window.confirm(t(K.PORTAL_ACCESS_CONFIRM_SINGLE_REVOKE, "Revoke {portal} for {name}?").replace("{portal}", portalLabel).replace("{name}", user.fullName))) return;

    try {
      await removeRole(user.userID, role);
      alert(t(K.PORTAL_ACCESS_REVOKE_SUCCESS, "Revoked {portal} successfully.").replace("{portal}", portalLabel));
      await fetchUsers();
    } catch (error) {
      console.error("Revoke portal access failed:", error);
      alert(t(K.PORTAL_ACCESS_REVOKE_FAILED, "Revoke failed: {error}").replace("{error}", error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <Card extra="w-full shrink-0 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">{t(K.PORTAL_ACCESS_TITLE, "Portal Access Management")}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(K.PORTAL_ACCESS_DESCRIPTION, "Grant or revoke portal access by linking UserProfiles to Student / Instructor / Technician domain roles.")}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <select
              value={selectedPortalId}
              onChange={(e) => setSelectedPortalId(e.target.value)}
              className="rounded border px-3 py-2 text-sm dark:bg-navy-800 dark:border-gray-600"
              disabled={submitting || loading}
            >
              {PORTAL_ROLE_MAPPINGS.map((portal) => (
                <option key={portal.id} value={portal.id}>
                  {t(portal.translationKey, portal.label)}
                </option>
              ))}
            </select>

            <button
              onClick={() => processBulk("grant")}
              disabled={loading || submitting || selectedCount === 0}
              className="rounded bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t(K.PORTAL_ACCESS_GRANT_SELECTED, "Grant Selected ({count})").replace("{count}", selectedCount)}
            </button>
            <button
              onClick={() => processBulk("revoke")}
              disabled={loading || submitting || selectedCount === 0}
              className="rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t(K.PORTAL_ACCESS_REVOKE_SELECTED, "Revoke Selected ({count})").replace("{count}", selectedCount)}
            </button>
          </div>
        </div>
      </Card>

      <Card extra="w-full min-h-0 flex-1 px-2 sm:px-0">
        {loading ? (
          <div className="py-8 text-center">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
        ) : (
          <div className="h-full min-h-0 overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={submitting}
                    />
                  </th>
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">{t(K.ADMIN_TABLE_FULL_NAME, "Full Name")}</th>
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">{t(K.ADMIN_TABLE_EMAIL, "Email")}</th>
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">{t(K.ADMIN_TABLE_DEPARTMENT, "Department")}</th>
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">{t(K.PORTAL_STUDENT_NAME, "Student Portal")}</th>
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">{t(K.PORTAL_TEACHER_NAME, "Teacher Portal")}</th>
                  <th className="sticky top-0 z-10 bg-white p-3 text-left dark:bg-navy-800">{t(K.PORTAL_MAINTAINER_NAME, "Technician Portal")}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      {t(K.PORTAL_ACCESS_NO_USERS, "No users found")}
                    </td>
                  </tr>
                )}

                {users.map((user) => {
                  const studentActive = hasActiveRole(user, "Student");
                  const teacherActive = hasActiveRole(user, "Instructor");
                  const maintainerActive = hasActiveRole(user, "Technician");

                  return (
                    <tr key={user.userID} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.userID)}
                          onChange={() => toggleUser(user.userID)}
                          disabled={submitting}
                        />
                      </td>
                      <td className="p-3 dark:text-white">{user.fullName}</td>
                      <td className="p-3 dark:text-white">{user.email}</td>
                      <td className="p-3 dark:text-white">{user.departmentName || "-"}</td>
                      <td className="p-3">
                        {studentActive ? (
                          <button
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            onClick={() => handleSingleRevoke(user, "Student", K.PORTAL_STUDENT_NAME, "Student Portal")}
                            disabled={submitting}
                          >
                            {t(K.PORTAL_ACCESS_REVOKE, "Revoke")}
                          </button>
                        ) : (
                          <button
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            onClick={() => handleSingleGrant(user, "Student", K.PORTAL_STUDENT_NAME, "Student Portal")}
                            disabled={submitting}
                          >
                            {t(K.PORTAL_ACCESS_GRANT, "Grant")}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        {teacherActive ? (
                          <button
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            onClick={() => handleSingleRevoke(user, "Instructor", K.PORTAL_TEACHER_NAME, "Teacher Portal")}
                            disabled={submitting}
                          >
                            {t(K.PORTAL_ACCESS_REVOKE, "Revoke")}
                          </button>
                        ) : (
                          <button
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            onClick={() => handleSingleGrant(user, "Instructor", K.PORTAL_TEACHER_NAME, "Teacher Portal")}
                            disabled={submitting}
                          >
                            {t(K.PORTAL_ACCESS_GRANT, "Grant")}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        {maintainerActive ? (
                          <button
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            onClick={() => handleSingleRevoke(user, "Technician", K.PORTAL_MAINTAINER_NAME, "Technician Portal")}
                            disabled={submitting}
                          >
                            {t(K.PORTAL_ACCESS_REVOKE, "Revoke")}
                          </button>
                        ) : (
                          <button
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            onClick={() => handleSingleGrant(user, "Technician", K.PORTAL_MAINTAINER_NAME, "Technician Portal")}
                            disabled={submitting}
                          >
                            {t(K.PORTAL_ACCESS_GRANT, "Grant")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

