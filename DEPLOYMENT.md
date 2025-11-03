# Deployment Guide

## ✅ Your App is Now Production-Ready!

All hardcoded localhost URLs have been replaced with environment variables.

---

## 📦 Frontend Deployment (Vercel)

### 1. Push Your Code to GitHub
```bash
cd gal-almagor-frontend
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. **Set Root Directory**: `gal-almagor-frontend`
5. **Framework Preset**: Vite
6. **Add Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-app.onrender.com` (You'll get this after backend deployment)
7. Click "Deploy"

### 3. After Backend Deployment
- Go to your Vercel project settings
- Update `VITE_API_URL` with your actual Render backend URL
- Redeploy

---

## 🚀 Backend Deployment (Render)

### 1. Create New Web Service
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. **Settings**:
   - **Name**: `insurance-dashboard-api` (or your choice)
   - **Root Directory**: `gal-almagor-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Instance Type**: Free (or paid for better performance)

### 2. Environment Variables
Add these in Render dashboard:

```
NODE_ENV=production
PORT=3001
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
ALLOWED_ORIGINS=https://your-app.vercel.app
```

**Important**: Replace `your-app.vercel.app` with your actual Vercel URL after frontend deployment.

### 3. Deploy
Click "Create Web Service" - Render will automatically deploy your backend.

---

## 🔄 After Both Are Deployed

### Update Backend CORS
1. Get your Vercel URL (e.g., `https://your-app.vercel.app`)
2. In Render dashboard, update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
3. Your backend will automatically redeploy

### Update Frontend API URL
1. In Vercel dashboard, go to Settings → Environment Variables
2. Update `VITE_API_URL` with your Render backend URL:
   ```
   VITE_API_URL=https://insurance-dashboard-api.onrender.com
   ```
3. Trigger a redeploy from Vercel deployments tab

---

## 🧪 Testing Your Deployment

### 1. Test Backend
Visit your Render URL:
```
https://your-backend-app.onrender.com
```

You should see:
```json
{
  "message": "Backend API is running!",
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. Test Frontend
Visit your Vercel URL and test:
- ✅ Login page loads
- ✅ Can navigate to Dashboard, Upload, Insights, Agents
- ✅ Can fetch company list
- ✅ Can upload files
- ✅ Can view and manage agents

---

## 🔐 Security Checklist

- ✅ No hardcoded localhost URLs
- ✅ CORS properly configured with specific origins
- ✅ Environment variables for sensitive data
- ✅ Supabase keys stored securely
- ✅ Error messages don't expose sensitive info

---

## 📝 Local Development

### Frontend
```bash
cd gal-almagor-frontend
cp .env.example .env
# Edit .env and set VITE_API_URL=http://localhost:3001
npm run dev
```

### Backend
```bash
cd gal-almagor-backend
cp .env.example .env
# Edit .env and add your Supabase credentials
npm start
```

---

## 🐛 Troubleshooting

### CORS Errors
**Problem**: Frontend can't connect to backend

**Solution**:
1. Check backend logs in Render
2. Verify `ALLOWED_ORIGINS` in Render includes your Vercel URL
3. Make sure URL doesn't have trailing slash

### 404 Errors on Refresh
**Problem**: Page not found when refreshing on Vercel

**Solution**: Already handled by `vercel.json` (if you have it)

If not, create `gal-almagor-frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Backend Cold Starts (Render Free Tier)
**Problem**: First request takes 30+ seconds

**Solution**: This is normal for free tier. Upgrade to paid tier for always-on service.

---

## 🎉 You're Done!

Your app is now live and production-ready:
- ✅ Frontend on Vercel (fast, global CDN)
- ✅ Backend on Render (scalable, auto-deploy)
- ✅ Environment variables properly configured
- ✅ Secure CORS setup

**Next Steps**:
1. Set up custom domain (optional)
2. Enable SSL (automatic on Vercel/Render)
3. Set up monitoring (Render has built-in logs)
4. Configure auto-deploy on git push

