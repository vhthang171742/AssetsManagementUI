# Developer Guide - Extending the Assets Management System

## 🛠️ System Architecture

### Directory Structure
```
src/
├── services/api.js              # API service layer (centralized)
├── views/admin/
│   ├── assets/                  # Asset management module
│   ├── categories/              # Category management module
│   ├── departments/             # Department management module
│   ├── rooms/                   # Room management module
│   ├── handovers/               # Handover management module
│   └── [other modules]
├── components/                  # Reusable UI components
├── layouts/                     # Page layouts
├── routes.js                    # Route definitions
└── App.jsx                      # Main app component
```

## 📡 API Service Layer

The `src/services/api.js` file is the single source of truth for all API operations.

### Structure
```javascript
// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Helper function
const apiCall = async (endpoint, options = {}) => { ... }

// Service exports
export const assetService = { ... }
export const departmentService = { ... }
// etc.
```

### Adding a New API Service

1. **Define the service object:**
```javascript
export const newService = {
  getAll: () => apiCall("/NewEndpoint"),
  
  getById: (id) => apiCall(`/NewEndpoint/${id}`),
  
  create: (data) =>
    apiCall("/NewEndpoint", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  update: (id, data) =>
    apiCall(`/NewEndpoint/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  delete: (id) =>
    apiCall(`/NewEndpoint/${id}`, {
      method: "DELETE",
    }),
};
```

2. **Use in components:**
```javascript
import { newService } from "services/api";

const data = await newService.getAll();
```

## 🎨 Creating a New Management Module

### Step 1: Create the Directory Structure
```bash
mkdir -p src/views/admin/mymodule/components
```

### Step 2: Create the Main Index File
```jsx
// src/views/admin/mymodule/index.jsx
import React from "react";
import MyTable from "./components/MyTable";

export default function MyModule() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <MyTable />
    </div>
  );
}
```

### Step 3: Create the Component File
```jsx
// src/views/admin/mymodule/components/MyTable.jsx
import React, { useState, useEffect } from "react";
import { myService } from "services/api";
import Card from "components/card";

export default function MyTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await myService.getAll();
      setItems(data || []);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component logic
}
```

### Step 4: Update Routes
```javascript
// src/routes.js
import MyModule from "views/admin/mymodule";
import { MdIcon } from "react-icons/md";

const routes = [
  // ... existing routes
  {
    name: "My Module",
    layout: "/admin",
    path: "mymodule",
    icon: <MdIcon className="h-6 w-6" />,
    component: <MyModule />,
  },
];
```

## 🎯 Common Patterns

### CRUD Operations Pattern

#### Fetch Data
```javascript
const fetchItems = async () => {
  try {
    setLoading(true);
    const data = await myService.getAll();
    setItems(data || []);
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to fetch items");
  } finally {
    setLoading(false);
  }
};
```

#### Create/Update
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    if (editingId) {
      await myService.update(editingId, formData);
      alert("Item updated successfully");
    } else {
      await myService.create(formData);
      alert("Item created successfully");
    }
    setShowModal(false);
    fetchItems();
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to save: " + error.message);
  }
};
```

#### Delete
```javascript
const handleDelete = async (id) => {
  if (window.confirm("Are you sure?")) {
    try {
      await myService.delete(id);
      alert("Item deleted successfully");
      fetchItems();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete item");
    }
  }
};
```

## 🧩 Reusable Components

### Using Card Component
```jsx
import Card from "components/card";

<Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
  <h2 className="text-xl font-bold text-navy-700">Title</h2>
  {/* Content */}
</Card>
```

### Modal Pattern
```jsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 className="text-lg font-bold mb-4">Modal Title</h3>
      {/* Modal content */}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setShowModal(false)}>Cancel</button>
        <button onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  </div>
)}
```

### Data Table Pattern
```jsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b">
        <th className="text-left p-3">Column 1</th>
        <th className="text-left p-3">Column 2</th>
        <th className="text-left p-3">Actions</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="border-b hover:bg-gray-50">
          <td className="p-3">{item.field1}</td>
          <td className="p-3">{item.field2}</td>
          <td className="p-3 space-x-2">
            <button onClick={() => handleEdit(item)}>Edit</button>
            <button onClick={() => handleDelete(item.id)}>Delete</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## 🎨 Styling Guide

### Tailwind CSS Classes Used
- **Colors**: `text-navy-700`, `text-brand-500`, `text-gray-600`
- **Sizing**: `h-6`, `w-6`, `p-3`, `px-4`, `py-2`
- **Layout**: `grid`, `flex`, `flex-col`, `gap-2`
- **Effects**: `hover:bg-gray-600`, `rounded`, `shadow-lg`
- **Responsive**: `sm:`, `md:`, `lg:`, `xl:`

### Button Styles
```jsx
// Primary
<button className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600">
  Button
</button>

// Secondary
<button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
  Cancel
</button>

// Danger
<button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
  Delete
</button>
```

## 🧪 Testing Pattern

### Test API Connectivity
```javascript
// In console
import { assetService } from 'src/services/api';
assetService.getAll().then(console.log).catch(console.error);
```

### Test Form Submission
1. Open browser DevTools (F12)
2. Check Network tab
3. Submit form
4. Verify API request and response

## 🐛 Debugging Tips

### 1. Check API Calls
```javascript
// Add logging in api.js
const apiCall = async (endpoint, options = {}) => {
  console.log("API Call:", endpoint, options);
  // ... rest of function
};
```

### 2. Component State Debugging
```javascript
useEffect(() => {
  console.log("Items updated:", items);
}, [items]);
```

### 3. Browser DevTools
- **Network tab**: See API requests/responses
- **Console**: See JavaScript errors
- **React DevTools**: Inspect component state

## 📋 Checklist for New Features

- [ ] Create API service methods in `src/services/api.js`
- [ ] Create view folder under `src/views/admin/`
- [ ] Create main index.jsx component
- [ ] Create components subfolder with table/form components
- [ ] Add route to `src/routes.js`
- [ ] Add appropriate icon to the route
- [ ] Test API connectivity
- [ ] Test CRUD operations
- [ ] Test error handling
- [ ] Update documentation

## 🔗 Related Files

- **API Service**: `src/services/api.js`
- **Routes**: `src/routes.js`
- **Example Module**: `src/views/admin/assets/`
- **Documentation**: `API_INTEGRATION_GUIDE.md`

## 📞 Common Issues & Solutions

### Issue: API returns 400/404
**Solution**: Check request body format matches Swagger specification

### Issue: Components not updating after API call
**Solution**: Ensure state update is in `.then()` or after `await`

### Issue: Modal not closing
**Solution**: Call `setShowModal(false)` after successful operation

### Issue: Route not appearing in sidebar
**Solution**: Verify route is added to `routes` array in `routes.js`

## 🚀 Best Practices

1. **Always use the API service layer** - Don't make direct fetch calls
2. **Consistent error handling** - Use try-catch in all async operations
3. **User feedback** - Always show success/error messages
4. **Loading states** - Disable buttons and show loading indicators
5. **Form validation** - Validate before submission
6. **Code reusability** - Extract common patterns into components
7. **Documentation** - Comment complex logic
8. **Responsive design** - Test on mobile and desktop

---

Happy coding! 🚀
