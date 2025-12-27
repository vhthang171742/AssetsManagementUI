# Assets Management UI - Setup Guide

## Overview
This project is an Assets Management System admin panel built with React and Tailwind CSS. It integrates with the AM.API backend to manage:
- **Assets**: Track and manage inventory items
- **Asset Categories**: Organize assets by category
- **Departments**: Manage organizational departments
- **Rooms**: Manage physical spaces and their asset assignments
- **Handovers**: Record and track asset handover transactions

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- AM.API backend running (see configuration below)

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AssetsManagementUI
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API endpoint**
Create a `.env` file in the project root:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Replace `http://localhost:5000` with your actual API server URL.

## Running the Application

### Development Mode
```bash
npm start
```
The application will open at `http://localhost:3000`

### Production Build
```bash
npm run build
```

## Project Structure

```
src/
├── services/
│   └── api.js                 # API service layer with all endpoints
├── views/admin/
│   ├── assets/                # Assets management
│   ├── categories/            # Asset categories management
│   ├── departments/           # Departments management
│   ├── rooms/                 # Rooms and room assets management
│   ├── handovers/             # Handover records management
│   ├── default/               # Dashboard
│   ├── marketplace/           # NFT Marketplace (template)
│   ├── profile/               # User profile
│   └── tables/                # Data tables template
├── components/                # Reusable UI components
├── layouts/                   # Page layouts
├── routes.js                  # Route definitions
└── App.jsx                    # Main app component
```

## Features

### 1. Assets Management
- View all assets in a table format
- Create new assets with details (code, name, category, brand, model, etc.)
- Edit existing assets
- Delete assets
- Track asset quantity and pricing information

### 2. Asset Categories
- Manage asset categories
- Create, update, and delete categories
- Add descriptions to categories

### 3. Departments
- Manage organizational departments
- Create, update, and delete departments
- Track rooms per department

### 4. Rooms Management
- Create and manage physical rooms
- Assign rooms to departments
- Add/remove assets from rooms
- Track asset serial numbers and conditions
- View assets assigned to each room

### 5. Handovers
- Create handover records
- Track asset handover between parties
- Record handover details (who delivered, who received, date, notes)
- Add multiple assets to a single handover
- Track asset condition at handover time

## API Integration

The application connects to the AM.API backend through the `src/services/api.js` file. All API calls are centralized here for easy maintenance.

### Available API Services

#### assetCategoryService
- `getAll()` - Get all asset categories
- `getById(id)` - Get specific category
- `create(data)` - Create new category
- `update(id, data)` - Update category
- `delete(id)` - Delete category
- `getAssets(categoryId)` - Get assets in category

#### assetService
- `getAll()` - Get all assets
- `getById(id)` - Get specific asset
- `getByCode(assetCode)` - Get asset by code
- `getByCategory(categoryId)` - Get assets by category
- `create(data)` - Create new asset
- `update(id, data)` - Update asset
- `delete(id)` - Delete asset
- `updateQuantity(id, quantityChange)` - Update asset quantity

#### departmentService
- `getAll()` - Get all departments
- `getById(id)` - Get specific department
- `create(data)` - Create new department
- `update(id, data)` - Update department
- `delete(id)` - Delete department
- `getRooms(departmentId)` - Get rooms in department

#### roomService
- `getAll()` - Get all rooms
- `getById(id)` - Get specific room
- `create(data)` - Create new room
- `update(id, data)` - Update room
- `delete(id)` - Delete room
- `getAssets(roomId)` - Get assets in room
- `addAsset(roomId, data)` - Add asset to room
- `removeAsset(roomId, assetId)` - Remove asset from room
- `getByDepartment(departmentId)` - Get rooms by department

#### handoverService
- `getAll()` - Get all handover records
- `getById(id)` - Get specific handover
- `create(data)` - Create new handover
- `update(id, data)` - Update handover
- `delete(id)` - Delete handover
- `getByRoom(roomId)` - Get handovers for room
- `getDetails(handoverId)` - Get handover details
- `addDetail(handoverId, data)` - Add detail to handover
- `getDetailById(detailId)` - Get specific detail
- `updateDetail(detailId, data)` - Update detail
- `deleteDetail(detailId)` - Delete detail

## Usage Examples

### Using Asset Service
```javascript
import { assetService } from 'services/api';

// Get all assets
const assets = await assetService.getAll();

// Create new asset
const newAsset = await assetService.create({
  assetCode: 'ASSET001',
  assetName: 'Laptop',
  categoryID: 1,
  brand: 'Dell',
  quantity: 5,
  unitPrice: 999.99
});
```

## UI Components

All UI components use Tailwind CSS for styling. The components are pre-built with:
- Cards for content sections
- Data tables with pagination
- Modal dialogs for forms
- Form inputs and selects
- Action buttons (Create, Edit, Delete)

## Error Handling

The application includes built-in error handling:
- API errors are caught and displayed to the user
- User-friendly error messages
- Console logging for debugging

## Security Considerations

1. The API URL is configurable via environment variables
2. All API calls use proper HTTP methods
3. Error messages don't expose sensitive information
4. User should implement authentication headers if required by the backend

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Customization

### Adding a New Management Page

1. Create a new folder under `views/admin/`
2. Create `index.jsx` and `components/` folder
3. Implement your table component
4. Add route to `routes.js`
5. Import and add to routes array
6. Component will automatically appear in sidebar

### Styling

To customize colors and styles:
- Edit `src/assets/css/` files
- Modify `tailwind.config.js` for theme changes
- Use Tailwind utility classes in components

## Troubleshooting

### API Connection Issues
- Verify API_URL in .env file
- Check if backend server is running
- Check CORS settings on backend

### Port Already in Use
```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

## Build and Deployment

### Building for Production
```bash
npm run build
```

The `build/` folder is ready for deployment to:
- Vercel
- Netlify
- AWS S3
- Any static hosting service

## Support

For issues and questions, please refer to:
- API Documentation: Swagger API spec (swagger.json)
- React Documentation: https://react.dev
- Tailwind CSS: https://tailwindcss.com

## License

This project is part of the Assets Management System.
