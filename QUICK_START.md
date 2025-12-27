# Quick Start Guide - Assets Management UI

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure API Endpoint
Create a `.env` file in the root directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Note:** Replace `http://localhost:5000` with your actual AM.API server URL

### Step 3: Start the Application
```bash
npm start
```

The application will automatically open at `http://localhost:3000`

## 📋 What You'll See

Once the app is running, you'll have access to these management modules in the sidebar:

1. **Assets** - Manage your asset inventory
2. **Categories** - Organize assets by type
3. **Departments** - Manage organizational structure
4. **Rooms** - Manage physical spaces and asset locations
5. **Handovers** - Record asset transfers

## 🎯 Common Tasks

### Adding a New Asset
1. Go to **Assets** → Click **Add Asset**
2. Fill in the form with asset details
3. Select a category from the dropdown
4. Click **Create**

### Creating a Department
1. Go to **Departments** → Click **Add Department**
2. Enter department code and name
3. Click **Create**

### Setting Up a Room
1. Go to **Rooms** → Click **Add Room**
2. Select a department
3. Enter room name and description
4. Click **Create**
5. Click **Assets** button to add items to the room

### Recording a Handover
1. Go to **Handovers** → Click **Create Handover**
2. Select a room and enter handover date
3. Enter who delivered and who received
4. Click **Create**
5. Click **Details** to add assets to the handover

## 🔧 API Configuration

The application connects to your AM.API backend automatically based on the `REACT_APP_API_URL` environment variable.

### For Local Development
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### For Remote Server
```env
REACT_APP_API_URL=https://your-api-domain.com/api
```

### For Network Testing
```env
REACT_APP_API_URL=http://192.168.x.x:5000/api
```

## ✅ Troubleshooting

### "Cannot reach API" Error
- ✓ Verify AM.API server is running
- ✓ Check the API URL in `.env` file
- ✓ Ensure no typos in the URL
- ✓ Check firewall/network settings

### Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Module Not Found Error
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 For More Information

- 📖 See [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) for detailed API documentation
- 🐛 Check [README.md](./README.md) for general information
- 📝 Review [swagger.json](./swagger.json) for full API specification

## 🎉 You're All Set!

Your Assets Management System is now ready to use. Start by exploring the different management modules and familiarizing yourself with the interface.

Happy managing! 🚀
