import React, { useState, useEffect } from "react";
import { roomService, departmentService, assetService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdInventory2, MdRemoveCircle } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function RoomsTable() {
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomAssets, setRoomAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [formData, setFormData] = useState({
    departmentID: "",
    roomName: "",
    description: "",
  });
  const [assetFormData, setAssetFormData] = useState({
    assetID: "",
    serialNumber: "",
    currentCondition: "",
    remarks: "",
  });

  useEffect(() => {
    fetchRooms();
    fetchDepartments();
    fetchAssets();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomService.getAll();
      setRooms(data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      alert(`Failed to fetch rooms: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getAll();
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const fetchAssets = async () => {
    try {
      const data = await assetService.getAll();
      setAllAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const fetchRoomAssets = async (roomId) => {
    try {
      const data = await roomService.getAssets(roomId);
      setRoomAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch room assets:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAssetInputChange = (e) => {
    const { name, value } = e.target;
    setAssetFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await roomService.update(editingId, formData);
        alert("Room updated successfully");
      } else {
        await roomService.create(formData);
        alert("Room created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        departmentID: "",
        roomName: "",
        description: "",
      });
      fetchRooms();
    } catch (error) {
      console.error("Failed to save room:", error);
      alert("Failed to save room: " + error.message);
    }
  };

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    try {
      await roomService.addAsset(selectedRoomId, assetFormData);
      alert("Asset added to room successfully");
      setShowAssetModal(false);
      setAssetFormData({
        assetID: "",
        serialNumber: "",
        currentCondition: "",
        remarks: "",
      });
      fetchRoomAssets(selectedRoomId);
    } catch (error) {
      console.error("Failed to add asset:", error);
      alert("Failed to add asset: " + error.message);
    }
  };

  const handleEdit = (room) => {
    setFormData({
      departmentID: room.departmentID,
      roomName: room.roomName,
      description: room.description,
    });
    setEditingId(room.roomID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        await roomService.delete(id);
        alert("Room deleted successfully");
        fetchRooms();
      } catch (error) {
        console.error("Failed to delete room:", error);
        alert(`Failed to delete room: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await roomService.bulkDelete(ids);
      alert("Deleted selected rooms");
      fetchRooms();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected rooms: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const handleRemoveAsset = async (roomId, assetId) => {
    if (window.confirm("Are you sure you want to remove this asset from the room?")) {
      try {
        await roomService.removeAsset(roomId, assetId);
        alert("Asset removed successfully");
        fetchRoomAssets(roomId);
      } catch (error) {
        console.error("Failed to remove asset:", error);
        alert(`Failed to remove asset: ${error.message || "Unknown error"}`);
      }
    }
  };

  const openAssetModal = (roomId) => {
    setSelectedRoomId(roomId);
    setShowAssetModal(true);
    fetchRoomAssets(roomId);
  };

  const getDepartmentName = (departmentID) => {
    const dept = departments.find((d) => d.departmentID === departmentID);
    return dept ? dept.departmentName : "Unknown";
  };

  const getAssetName = (assetID) => {
    const asset = allAssets.find((a) => a.assetID === assetID);
    return asset ? asset.assetName : "Unknown";
  };

  return (
    <>
      <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                departmentID: "",
                roomName: "",
                description: "",
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            Add Room
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Table
            data={rooms}
            pageSize={10}
            height={'calc(100vh - 240px)'}
            onBulkDelete={handleBulkDelete}
            selectable={true}
            idField="roomID"
            columns={[
              { header: 'Room Name', accessor: 'roomName' },
              { header: 'Department', accessor: 'departmentID', render: (row) => getDepartmentName(row.departmentID) },
              { header: 'Description', accessor: 'description' },
              {
                header: 'Actions',
                render: (row) => (
                  <div className="space-x-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openAssetModal(row.roomID)}
                          title="Assets"
                          aria-label="Assets"
                          className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <MdInventory2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(row)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <MdModeEditOutline className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.roomID)}
                          title="Delete"
                          aria-label="Delete"
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <MdDelete className="h-4 w-4" />
                        </button>
                      </div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Room Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? "Edit Room" : "Add New Room"}
          maxWidth={"max-w-md"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="roomForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="roomForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">Department</label>
              <select
                name="departmentID"
                value={formData.departmentID}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.departmentID} value={dept.departmentID}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">Room Name</label>
              <input
                type="text"
                name="roomName"
                placeholder="Room Name"
                value={formData.roomName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">Description</label>
              <textarea
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="3"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Room Assets Modal */}
      {showAssetModal && (
        <Modal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          title={"Room Assets"}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                onClick={() => setShowAssetModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Close
              </button>
            </>
          }
        >
          <div className="mb-4">
            {/* Add Asset Form */}
            <form onSubmit={handleAddAssetSubmit} className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <h4 className="font-semibold mb-3 dark:text-white">Add Asset to Room</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">Asset</label>
                  <select
                    name="assetID"
                    value={assetFormData.assetID}
                    onChange={handleAssetInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    required
                  >
                    <option value="">Select Asset</option>
                    {allAssets.map((asset) => (
                      <option key={asset.assetID} value={asset.assetID}>
                        {asset.assetName} ({asset.assetCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">Serial Number</label>
                  <input
                    type="text"
                    name="serialNumber"
                    placeholder="e.g., SN-12345"
                    value={assetFormData.serialNumber}
                    onChange={handleAssetInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">Current Condition</label>
                  <input
                    type="text"
                    name="currentCondition"
                    placeholder="e.g., Good, Fair, Poor"
                    value={assetFormData.currentCondition}
                    onChange={handleAssetInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-white">Remarks</label>
                  <textarea
                    name="remarks"
                    placeholder="Additional remarks..."
                    value={assetFormData.remarks}
                    onChange={handleAssetInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                    rows="2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                Add Asset
              </button>
            </form>

            {/* Assets List */}
            <div>
              <h4 className="font-semibold mb-3 dark:text-white">Current Assets</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-600">
                      <th className="text-left p-2 dark:text-white">Asset Name</th>
                      <th className="text-left p-2 dark:text-white">Serial Number</th>
                      <th className="text-left p-2 dark:text-white">Condition</th>
                      <th className="text-left p-2 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomAssets.map((asset) => (
                      <tr key={asset.roomAssetID} className="border-b dark:border-gray-600 dark:text-white">
                        <td className="p-2">{asset.assetName}</td>
                        <td className="p-2">{asset.serialNumber}</td>
                        <td className="p-2">{asset.currentCondition}</td>
                        <td className="p-2">
                          <button
                            onClick={() =>
                              handleRemoveAsset(selectedRoomId, asset.assetID)
                            }
                            title="Remove"
                            aria-label="Remove"
                            className="p-2 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            <MdRemoveCircle className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
