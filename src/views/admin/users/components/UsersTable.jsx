import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { getAllUsers, assignRole, removeRole, updateUserCode } from "services/userService";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdAdd } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function UsersTable() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    role: "Student",
    roleCode: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_USERS, "users")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    try {
      await assignRole(
        selectedUser.userID,
        roleFormData.role,
        roleFormData.roleCode || null
      );
      toast.success(`${t(K.ADMIN_TABLE_ROLE, "Role")} "${roleFormData.role}" ${t(K.ADMIN_TABLE_ASSIGNED_SUCCESSFULLY, "assigned successfully")}`);
      setShowRoleModal(false);
      setRoleFormData({ role: "Student", roleCode: "" });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Failed to assign role:", error);
      toast.error(`${t(K.ADMIN_TABLE_FAILED_ASSIGN_ROLE, "Failed to assign role")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    }
  };

  const handleRemoveRole = async (userId, role) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_REMOVE_ROLE, `Are you sure you want to remove the "${role}" role from this user?`, { role }))) {
      try {
        await removeRole(userId, role);
        toast.success(`${t(K.ADMIN_TABLE_ROLE, "Role")} "${role}" ${t(K.ADMIN_TABLE_REMOVED_SUCCESSFULLY, "removed successfully")}`);
        fetchUsers();
      } catch (error) {
        console.error("Failed to remove role:", error);
        toast.error(`${t(K.ADMIN_TABLE_FAILED_REMOVE_ROLE, "Failed to remove role")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleUpdateCode = async (e) => {
    e.preventDefault();
    try {
      await updateUserCode(
        selectedUser.userID,
        roleFormData.role,
        roleFormData.roleCode
      );
      toast.success(t(K.ADMIN_TABLE_CODE_UPDATED_SUCCESSFULLY, "Code updated successfully"));
      setShowCodeModal(false);
      setRoleFormData({ role: "Student", roleCode: "" });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Failed to update code:", error);
      toast.error(`${t(K.ADMIN_TABLE_FAILED_UPDATE_CODE, "Failed to update code")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    }
  };

  const openAssignRoleModal = (user) => {
    setSelectedUser(user);
    setRoleFormData({ role: "Student", roleCode: "" });
    setShowRoleModal(true);
  };

  const openEditCodeModal = (user, role) => {
    setSelectedUser(user);
    // Get current code based on role
    let currentCode = "";
    if (role === "Student") currentCode = user.studentRole?.studentCode || "";
    else if (role === "Worker") currentCode = user.workerRole?.employeeCode || "";
    else if (role === "Instructor") currentCode = user.instructorRole?.instructorCode || "";
    else if (role === "Technician") currentCode = user.technicianRole?.technicianCode || "";

    setRoleFormData({ role, roleCode: currentCode });
    setShowCodeModal(true);
  };

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return users.filter((u) =>
      !query ||
      u.fullName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.departmentName?.toLowerCase().includes(query)
    );
  }, [users, searchText]);

  return (
    <>
      <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_EMAIL_DEPARTMENT, "Search name, email, department")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white md:w-72"
          />
        </div>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Table
            data={filteredUsers}
            pageSize={10}
            selectable={false}
            columns={[
              { header: t(K.ADMIN_TABLE_FULL_NAME, "Full Name"), accessor: 'fullName' },
              { header: t(K.ADMIN_TABLE_EMAIL, "Email"), accessor: 'email' },
              { 
                header: t(K.ADMIN_TABLE_DEPARTMENT, "Department"), 
                render: (row) => row.departmentName || '-' 
              },
              {
                header: t(K.ADMIN_TABLE_ROLES, "Roles"),
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    {row.roles && row.roles.length > 0 ? (
                      row.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-700 text-xs rounded"
                        >
                          {role}
                          <button
                            onClick={() => handleRemoveRole(row.userID, role)}
                            className="hover:text-red-600"
                            title={t(K.ADMIN_TABLE_REMOVE_ROLE, "Remove role")}
                          >
                            <MdDelete className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">{t(K.ADMIN_TABLE_NO_ROLES, "No roles")}</span>
                    )}
                  </div>
                ),
              },
              {
                header: t(K.ADMIN_TABLE_BUSINESS_CODES, "Business Codes"),
                render: (row) => (
                  <div className="space-y-1 text-xs">
                    {row.studentRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(K.ADMIN_TABLE_STUDENT, "Student")}:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.studentRole.studentCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Student')}
                          className="text-blue-500 hover:text-blue-700"
                          title={t(K.ADMIN_TABLE_EDIT_CODE, "Edit code")}
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {row.workerRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(K.ADMIN_TABLE_WORKER, "Worker")}:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.workerRole.employeeCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Worker')}
                          className="text-blue-500 hover:text-blue-700"
                          title={t(K.ADMIN_TABLE_EDIT_CODE, "Edit code")}
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {row.instructorRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(K.ADMIN_TABLE_INSTRUCTOR, "Instructor")}:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.instructorRole.instructorCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Instructor')}
                          className="text-blue-500 hover:text-blue-700"
                          title={t(K.ADMIN_TABLE_EDIT_CODE, "Edit code")}
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {row.technicianRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(K.ADMIN_TABLE_TECHNICIAN, "Technician")}:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.technicianRole.technicianCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Technician')}
                          className="text-blue-500 hover:text-blue-700"
                          title={t(K.ADMIN_TABLE_EDIT_CODE, "Edit code")}
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: t(K.ADMIN_TABLE_LAST_LOGIN, "Last Login"),
                render: (row) => 
                  row.lastLoginAt 
                    ? new Date(row.lastLoginAt).toLocaleString() 
                    : t(K.ADMIN_TABLE_NEVER, "Never"),
              },
              {
                header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAssignRoleModal(row)}
                      title={t(K.ADMIN_TABLE_ASSIGN_ROLE, "Assign Role")}
                      className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <MdAdd className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Assign Role Modal */}
      {showRoleModal && selectedUser && (
        <Modal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
            setRoleFormData({ role: "Student", roleCode: "" });
          }}
          title={t(K.ADMIN_TABLE_ASSIGN_ROLE_TO, `Assign Role to ${selectedUser.fullName}`, { name: selectedUser.fullName })}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setRoleFormData({ role: "Student", roleCode: "" });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-navy-700"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="assign-role-form"
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                {t(K.ADMIN_TABLE_ASSIGN_ROLE, "Assign Role")}
              </button>
            </>
          }
        >
          <form id="assign-role-form" onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_ROLE, "Role")}</label>
              <select
                value={roleFormData.role}
                onChange={(e) => setRoleFormData({ ...roleFormData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-navy-800 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="Student">{t(K.ADMIN_TABLE_STUDENT, "Student")}</option>
                <option value="Worker">{t(K.ADMIN_TABLE_WORKER, "Worker")}</option>
                <option value="Instructor">{t(K.ADMIN_TABLE_INSTRUCTOR, "Instructor")}</option>
                <option value="Technician">{t(K.ADMIN_TABLE_TECHNICIAN, "Technician")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">
                {t(K.ADMIN_TABLE_BUSINESS_CODE_OPTIONAL, "Business Code (optional)")}
              </label>
              <input
                type="text"
                value={roleFormData.roleCode}
                onChange={(e) => setRoleFormData({ ...roleFormData, roleCode: e.target.value })}
                placeholder={t(K.ADMIN_TABLE_LEAVE_EMPTY_AUTO_GENERATION, "Leave empty for auto-generation")}
                className="w-full px-3 py-2 border rounded-lg dark:bg-navy-800 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t(K.ADMIN_TABLE_AUTO_CODE_EXAMPLE, "If empty, code will be auto-generated (e.g., STU-000001)")}
              </p>
            </div>

          </form>
        </Modal>
      )}

      {/* Edit Code Modal */}
      {showCodeModal && selectedUser && (
        <Modal
          isOpen={showCodeModal}
          onClose={() => {
            setShowCodeModal(false);
            setSelectedUser(null);
            setRoleFormData({ role: "Student", roleCode: "" });
          }}
          title={t(K.ADMIN_TABLE_EDIT_ROLE_CODE_FOR, `Edit ${roleFormData.role} Code for ${selectedUser.fullName}`, { role: roleFormData.role, name: selectedUser.fullName })}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(false);
                  setSelectedUser(null);
                  setRoleFormData({ role: "Student", roleCode: "" });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:text-white dark:border-gray-600 dark:hover:bg-navy-700"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="update-code-form"
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                {t(K.ADMIN_TABLE_UPDATE_CODE, "Update Code")}
              </button>
            </>
          }
        >
          <form id="update-code-form" onSubmit={handleUpdateCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">
                {t(K.ADMIN_TABLE_ROLE_CODE, `${roleFormData.role} Code`, { role: roleFormData.role })}
              </label>
              <input
                type="text"
                value={roleFormData.roleCode}
                onChange={(e) => setRoleFormData({ ...roleFormData, roleCode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-navy-800 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

