import React from "react";

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = "max-w-2xl" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`bg-white rounded-lg w-full ${maxWidth} max-h-[80vh] flex flex-col border border-gray-300 shadow-lg overflow-hidden`}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
