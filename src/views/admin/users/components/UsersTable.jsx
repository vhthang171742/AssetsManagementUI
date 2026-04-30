import React, { useState, useEffect } from "react";
import { getAllUsers, assignRole, removeRole, updateUserCode } from "services/userService";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdAdd } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
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
      alert(`Failed to fetch users: ${error.message || "Unknown error"}`);
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
      alert(`Role "${roleFormData.role}" assigned successfully`);
      setShowRoleModal(false);
      setRoleFormData({ role: "Student", roleCode: "" });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Failed to assign role:", error);
      alert(`Failed to assign role: ${error.message || "Unknown error"}`);
    }
  };

  const handleRemoveRole = async (userId, role) => {
    if (window.confirm(`Are you sure you want to remove the "${role}" role from this user?`)) {
      try {
        await removeRole(userId, role);
        alert(`Role "${role}" removed successfully`);
        fetchUsers();
      } catch (error) {
        console.error("Failed to remove role:", error);
        alert(`Failed to remove role: ${error.message || "Unknown error"}`);
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
      alert("Code updated successfully");
      setShowCodeModal(false);
      setRoleFormData({ role: "Student", roleCode: "" });
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Failed to update code:", error);
      alert(`Failed to update code: ${error.message || "Unknown error"}`);
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

  return (
    <>
      <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Table
            data={users}
            pageSize={10}
            selectable={false}
            columns={[
              { header: 'Full Name', accessor: 'fullName' },
              { header: 'Email', accessor: 'email' },
              { 
                header: 'Department', 
                render: (row) => row.departmentName || '-' 
              },
              {
                header: 'Roles',
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
                            title="Remove role"
                          >
                            <MdDelete className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">No roles</span>
                    )}
                  </div>
                ),
              },
              {
                header: 'Business Codes',
                render: (row) => (
                  <div className="space-y-1 text-xs">
                    {row.studentRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Student:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.studentRole.studentCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Student')}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit code"
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {row.workerRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Worker:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.workerRole.employeeCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Worker')}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit code"
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {row.instructorRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Instructor:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.instructorRole.instructorCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Instructor')}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit code"
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {row.technicianRole && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Technician:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.technicianRole.technicianCode || 'N/A'}
                        </span>
                        <button
                          onClick={() => openEditCodeModal(row, 'Technician')}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit code"
                        >
                          <MdModeEditOutline className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'Last Login',
                render: (row) => 
                  row.lastLoginAt 
                    ? new Date(row.lastLoginAt).toLocaleString() 
                    : 'Never',
              },
              {
                header: 'Actions',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAssignRoleModal(row)}
                      title="Assign Role"
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
          title={`Assign Role to ${selectedUser.fullName}`}
        >
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={roleFormData.role}
                onChange={(e) => setRoleFormData({ ...roleFormData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-navy-800 dark:border-gray-600"
                required
              >
                <option value="Student">Student</option>
                <option value="Worker">Worker</option>
                <option value="Instructor">Instructor</option>
                <option value="Technician">Technician</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Business Code (optional)
              </label>
              <input
                type="text"
                value={roleFormData.roleCode}
                onChange={(e) => setRoleFormData({ ...roleFormData, roleCode: e.target.value })}
                placeholder="Leave empty for auto-generation"
                className="w-full px-3 py-2 border rounded-lg dark:bg-navy-800 dark:border-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                If empty, code will be auto-generated (e.g., STU-000001)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setRoleFormData({ role: "Student", roleCode: "" });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-navy-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                Assign Role
              </button>
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
          title={`Edit ${roleFormData.role} Code for ${selectedUser.fullName}`}
        >
          <form onSubmit={handleUpdateCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {roleFormData.role} Code
              </label>
              <input
                type="text"
                value={roleFormData.roleCode}
                onChange={(e) => setRoleFormData({ ...roleFormData, roleCode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-navy-800 dark:border-gray-600"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(false);
                  setSelectedUser(null);
                  setRoleFormData({ role: "Student", roleCode: "" });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-navy-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                Update Code
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

