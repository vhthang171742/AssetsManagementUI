import React, { useEffect, useMemo, useState } from "react";
import Card from "components/card";
import {
  getAllUsers,
  assignRole,
  removeRole,
} from "services/userService";

const PORTAL_ROLE_MAPPINGS = [
  { id: "student", label: "Student Portal", role: "Student" },
  { id: "teacher", label: "Teacher Portal", role: "Instructor" },
  { id: "maintainer", label: "Maintainer Portal", role: "Technician" },
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
      alert(`Failed to fetch users: ${error.message || "Unknown error"}`);
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
      alert("Please select at least one user.");
      return;
    }

    const targetUsers = users.filter((user) => selectedUsers.has(user.userID));

    const usersToProcess = targetUsers.filter((user) => {
      const active = hasActiveRole(user, selectedPortal.role);
      return mode === "grant" ? !active : active;
    });

    if (usersToProcess.length === 0) {
      alert(
        mode === "grant"
          ? `All selected users already have ${selectedPortal.label} access.`
          : `None of the selected users currently have ${selectedPortal.label} access.`
      );
      return;
    }

    const confirmed = window.confirm(
      `${mode === "grant" ? "Grant" : "Revoke"} ${selectedPortal.label} for ${usersToProcess.length} user(s)?`
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
        alert(`${mode === "grant" ? "Granted" : "Revoked"} ${selectedPortal.label} for ${successCount} user(s).`);
      } else {
        alert(
          `${mode === "grant" ? "Granted" : "Revoked"} ${selectedPortal.label} for ${successCount} user(s). ` +
            `${failed.length} user(s) failed. Check console for details.`
        );
        console.error("Portal access bulk operation failures:", failed);
      }

      await fetchUsers();
    } catch (error) {
      console.error("Bulk portal access operation failed:", error);
      alert(`Bulk operation failed: ${error.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleGrant = async (user, role, label) => {
    try {
      await assignRole(user.userID, role, null);
      alert(`Granted ${label} successfully.`);
      await fetchUsers();
    } catch (error) {
      console.error("Grant portal access failed:", error);
      alert(`Grant failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleSingleRevoke = async (user, role, label) => {
    if (!window.confirm(`Revoke ${label} for ${user.fullName}?`)) return;

    try {
      await removeRole(user.userID, role);
      alert(`Revoked ${label} successfully.`);
      await fetchUsers();
    } catch (error) {
      console.error("Revoke portal access failed:", error);
      alert(`Revoke failed: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card extra="w-full p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">Portal Access Management</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Grant or revoke portal access by linking UserProfiles to Student / Instructor / Technician domain roles.
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
                  {portal.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => processBulk("grant")}
              disabled={loading || submitting || selectedCount === 0}
              className="rounded bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Grant Selected ({selectedCount})
            </button>
            <button
              onClick={() => processBulk("revoke")}
              disabled={loading || submitting || selectedCount === 0}
              className="rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revoke Selected ({selectedCount})
            </button>
          </div>
        </div>
      </Card>

      <Card extra="w-full h-full sm:overflow-auto px-2 sm:px-0">
        {loading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={submitting}
                    />
                  </th>
                  <th className="p-3 text-left">Full Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Student Portal</th>
                  <th className="p-3 text-left">Teacher Portal</th>
                  <th className="p-3 text-left">Maintainer Portal</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      No users found
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
                            onClick={() => handleSingleRevoke(user, "Student", "Student Portal")}
                            disabled={submitting}
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            onClick={() => handleSingleGrant(user, "Student", "Student Portal")}
                            disabled={submitting}
                          >
                            Grant
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        {teacherActive ? (
                          <button
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            onClick={() => handleSingleRevoke(user, "Instructor", "Teacher Portal")}
                            disabled={submitting}
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            onClick={() => handleSingleGrant(user, "Instructor", "Teacher Portal")}
                            disabled={submitting}
                          >
                            Grant
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        {maintainerActive ? (
                          <button
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            onClick={() => handleSingleRevoke(user, "Technician", "Maintainer Portal")}
                            disabled={submitting}
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                            onClick={() => handleSingleGrant(user, "Technician", "Maintainer Portal")}
                            disabled={submitting}
                          >
                            Grant
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
