# Deployment Guide for AI Hashira

This guide will help you deploy the AI Hashira application to make it accessible to users outside your network.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or any MongoDB hosting)
- AWS account with Bedrock access
- A cloud platform for hosting (Heroku, Render, AWS, etc.)

## Backend Deployment

### Option 1: Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: Add all variables from your `.env` file

### Option 2: Deploy to Heroku

1. Create a new app on Heroku
2. Connect your GitHub repository or use Heroku CLI
3. Add the following buildpack: `heroku/nodejs`
4. Configure environment variables in the Settings tab
5. Deploy the application

### Option 3: Deploy to AWS Elastic Beanstalk

1. Install the AWS CLI and EB CLI
2. Initialize your EB application: `eb init`
3. Create an environment: `eb create`
4. Configure environment variables: `eb setenv KEY=VALUE`
5. Deploy: `eb deploy`

## Frontend Deployment

### Option 1: Deploy to Netlify or Vercel

1. Connect your GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Add environment variables:
   - `VITE_API_BASE_URL`: URL of your deployed backend API

### Option 2: Deploy to GitHub Pages

1. Update `vite.config.js` to include your base path
2. Build the frontend: `npm run build`
3. Deploy to GitHub Pages using GitHub Actions or manually

## Environment Configuration

### Backend (.env)

```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
AWS_REGION=your_aws_region
AWS_PROFILE=your_aws_profile
NODE_ENV=production
```

### Frontend (.env)

```
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_NODE_ENV=production
```

## Quick Deployment with ngrok (Development/Testing)

For quick testing or sharing with others during development:

1. Install ngrok: `npm install -g ngrok`
2. Start your backend server locally: `npm run dev`
3. In a separate terminal, run: `ngrok http 5000`
4. Ngrok will provide a public URL that forwards to your local server
5. Update your frontend `.env` file with this URL: `VITE_API_BASE_URL=https://your-ngrok-url.ngrok.io/api`

## Security Considerations

1. Ensure your JWT_SECRET is strong and kept secret
2. Set up proper CORS configuration
3. Use HTTPS for production deployments
4. Implement rate limiting for API endpoints
5. Set up proper AWS IAM roles with least privilege principle
6. Monitor your AWS Bedrock usage to control costs

## Troubleshooting

- If you encounter CORS issues, check your CORS configuration in the backend
- If authentication fails, ensure your JWT_SECRET is correctly set
- If AWS Bedrock calls fail, verify your AWS credentials and permissions
- For connection issues, check your MongoDB connection string and network settings