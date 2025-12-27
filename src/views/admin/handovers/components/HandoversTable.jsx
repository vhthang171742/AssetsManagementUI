import React, { useState, useEffect } from "react";
import { handoverService, roomService, assetService } from "services/api";
import Card from "components/card";

export default function HandoversTable() {
  const [handovers, setHandovers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedHandoverId, setSelectedHandoverId] = useState(null);
  const [handoverDetails, setHandoverDetails] = useState([]);
  const [formData, setFormData] = useState({
    roomID: "",
    handoverDate: "",
    deliveredBy: "",
    receivedBy: "",
    notes: "",
  });
  const [detailFormData, setDetailFormData] = useState({
    assetID: "",
    quantity: 1,
    conditionAtHandover: "",
    remarks: "",
  });

  useEffect(() => {
    fetchHandovers();
    fetchRooms();
    fetchAssets();
  }, []);

  const fetchHandovers = async () => {
    try {
      setLoading(true);
      const data = await handoverService.getAll();
      setHandovers(data || []);
    } catch (error) {
      console.error("Failed to fetch handovers:", error);
      alert("Failed to fetch handovers");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await roomService.getAll();
      setRooms(data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const fetchAssets = async () => {
    try {
      const data = await assetService.getAll();
      setAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const fetchHandoverDetails = async (handoverId) => {
    try {
      const data = await handoverService.getDetails(handoverId);
      setHandoverDetails(data || []);
    } catch (error) {
      console.error("Failed to fetch handover details:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDetailInputChange = (e) => {
    const { name, value } = e.target;
    setDetailFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await handoverService.update(editingId, formData);
        alert("Handover updated successfully");
      } else {
        await handoverService.create(formData);
        alert("Handover created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        roomID: "",
        handoverDate: "",
        deliveredBy: "",
        receivedBy: "",
        notes: "",
      });
      fetchHandovers();
    } catch (error) {
      console.error("Failed to save handover:", error);
      alert("Failed to save handover: " + error.message);
    }
  };

  const handleAddDetailSubmit = async (e) => {
    e.preventDefault();
    try {
      await handoverService.addDetail(selectedHandoverId, detailFormData);
      alert("Detail added successfully");
      setDetailFormData({
        assetID: "",
        quantity: 1,
        conditionAtHandover: "",
        remarks: "",
      });
      fetchHandoverDetails(selectedHandoverId);
    } catch (error) {
      console.error("Failed to add detail:", error);
      alert("Failed to add detail: " + error.message);
    }
  };

  const handleEdit = (handover) => {
    // Format date for datetime-local input
    const dateObj = new Date(handover.handoverDate);
    const formattedDate = dateObj.toISOString().slice(0, 16);

    setFormData({
      roomID: handover.roomID,
      handoverDate: formattedDate,
      deliveredBy: handover.deliveredBy || "",
      receivedBy: handover.receivedBy || "",
      notes: handover.notes || "",
    });
    setEditingId(handover.handoverID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this handover?")) {
      try {
        await handoverService.delete(id);
        alert("Handover deleted successfully");
        fetchHandovers();
      } catch (error) {
        console.error("Failed to delete handover:", error);
        alert("Failed to delete handover");
      }
    }
  };

  const handleDeleteDetail = async (detailId) => {
    if (window.confirm("Are you sure you want to delete this detail?")) {
      try {
        await handoverService.deleteDetail(detailId);
        alert("Detail deleted successfully");
        fetchHandoverDetails(selectedHandoverId);
      } catch (error) {
        console.error("Failed to delete detail:", error);
        alert("Failed to delete detail");
      }
    }
  };

  const openDetailsModal = (handoverId) => {
    setSelectedHandoverId(handoverId);
    fetchHandoverDetails(handoverId);
    setShowDetailsModal(true);
  };

  const getRoomName = (roomID) => {
    const room = rooms.find((r) => r.roomID === roomID);
    return room ? room.roomName : "Unknown";
  };

  const getAssetName = (assetID) => {
    const asset = assets.find((a) => a.assetID === assetID);
    return asset ? asset.assetName : "Unknown";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-navy-700">Handover Records</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                roomID: "",
                handoverDate: "",
                deliveredBy: "",
                receivedBy: "",
                notes: "",
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            Create Handover
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Room</th>
                  <th className="text-left p-3">Handover Date</th>
                  <th className="text-left p-3">Delivered By</th>
                  <th className="text-left p-3">Received By</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map((handover) => (
                  <tr key={handover.handoverID} className="border-b hover:bg-gray-50">
                    <td className="p-3">{getRoomName(handover.roomID)}</td>
                    <td className="p-3">{formatDate(handover.handoverDate)}</td>
                    <td className="p-3">{handover.deliveredBy}</td>
                    <td className="p-3">{handover.receivedBy}</td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => openDetailsModal(handover.handoverID)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleEdit(handover)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(handover.handoverID)}
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

      {/* Handover Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? "Edit Handover" : "Create New Handover"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Room</label>
                <select
                  name="roomID"
                  value={formData.roomID}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map((room) => (
                    <option key={room.roomID} value={room.roomID}>
                      {room.roomName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Handover Date
                </label>
                <input
                  type="datetime-local"
                  name="handoverDate"
                  value={formData.handoverDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Delivered By
                </label>
                <input
                  type="text"
                  name="deliveredBy"
                  placeholder="Delivered By"
                  value={formData.deliveredBy}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Received By
                </label>
                <input
                  type="text"
                  name="receivedBy"
                  placeholder="Received By"
                  value={formData.receivedBy}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  name="notes"
                  placeholder="Notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Handover Details</h3>
              <button
                onClick={() => {
                  setDetailFormData({
                    assetID: "",
                    quantity: 1,
                    conditionAtHandover: "",
                    remarks: "",
                  });
                  setShowDetailsModal(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* Add Detail Form */}
            <form
              onSubmit={handleAddDetailSubmit}
              className="mb-6 p-4 border rounded bg-gray-50"
            >
              <h4 className="font-semibold mb-3">Add Asset to Handover</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  name="assetID"
                  value={detailFormData.assetID}
                  onChange={handleDetailInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                >
                  <option value="">Select Asset</option>
                  {assets.map((asset) => (
                    <option key={asset.assetID} value={asset.assetID}>
                      {asset.assetName} ({asset.assetCode})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="quantity"
                  placeholder="Quantity"
                  value={detailFormData.quantity}
                  onChange={handleDetailInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                  min="1"
                />
                <input
                  type="text"
                  name="conditionAtHandover"
                  placeholder="Condition at Handover"
                  value={detailFormData.conditionAtHandover}
                  onChange={handleDetailInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <textarea
                  name="remarks"
                  placeholder="Remarks"
                  value={detailFormData.remarks}
                  onChange={handleDetailInputChange}
                  className="col-span-2 p-2 border rounded"
                  rows="2"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                Add Detail
              </button>
            </form>

            {/* Details List */}
            <div>
              <h4 className="font-semibold mb-3">Current Details</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Asset</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Condition</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoverDetails.map((detail) => (
                      <tr key={detail.handoverDetailID} className="border-b">
                        <td className="p-2">{detail.assetName}</td>
                        <td className="p-2">{detail.quantity}</td>
                        <td className="p-2">{detail.conditionAtHandover}</td>
                        <td className="p-2">
                          <button
                            onClick={() =>
                              handleDeleteDetail(detail.handoverDetailID)
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

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
