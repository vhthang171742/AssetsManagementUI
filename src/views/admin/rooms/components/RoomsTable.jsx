import React, { useState, useEffect } from "react";
import { roomService, departmentService, assetService } from "services/api";
import Card from "components/card";
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
      alert("Failed to fetch rooms");
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
        alert("Failed to delete room");
      }
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
        alert("Failed to remove asset");
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy-700">Rooms Management</h2>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Room Name</th>
                  <th className="text-left p-3">Department</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.roomID} className="border-b hover:bg-gray-50">
                    <td className="p-3">{room.roomName}</td>
                    <td className="p-3">{getDepartmentName(room.departmentID)}</td>
                    <td className="p-3">{room.description}</td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => openAssetModal(room.roomID)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      >
                        Assets
                      </button>
                      <button
                        onClick={() => handleEdit(room)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room.roomID)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
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
              <label className="block text-sm font-medium mb-2">Department</label>
              <select
                name="departmentID"
                value={formData.departmentID}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium mb-2">Room Name</label>
              <input
                type="text"
                name="roomName"
                placeholder="Room Name"
                value={formData.roomName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
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
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </>
          }
        >
          <div className="mb-4">
            {/* Add Asset Form */}
            <form onSubmit={handleAddAssetSubmit} className="mb-6 p-4 border rounded bg-gray-50">
              <h4 className="font-semibold mb-3">Add Asset to Room</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  name="assetID"
                  value={assetFormData.assetID}
                  onChange={handleAssetInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                >
                  <option value="">Select Asset</option>
                  {allAssets.map((asset) => (
                    <option key={asset.assetID} value={asset.assetID}>
                      {asset.assetName} ({asset.assetCode})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="serialNumber"
                  placeholder="Serial Number"
                  value={assetFormData.serialNumber}
                  onChange={handleAssetInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <input
                  type="text"
                  name="currentCondition"
                  placeholder="Current Condition"
                  value={assetFormData.currentCondition}
                  onChange={handleAssetInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <textarea
                  name="remarks"
                  placeholder="Remarks"
                  value={assetFormData.remarks}
                  onChange={handleAssetInputChange}
                  className="col-span-2 p-2 border rounded"
                  rows="2"
                />
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
              <h4 className="font-semibold mb-3">Current Assets</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Asset Name</th>
                      <th className="text-left p-2">Serial Number</th>
                      <th className="text-left p-2">Condition</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomAssets.map((asset) => (
                      <tr key={asset.roomAssetID} className="border-b">
                        <td className="p-2">{asset.assetName}</td>
                        <td className="p-2">{asset.serialNumber}</td>
                        <td className="p-2">{asset.currentCondition}</td>
                        <td className="p-2">
                          <button
                            onClick={() =>
                              handleRemoveAsset(selectedRoomId, asset.assetID)
                            }
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            Remove
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
