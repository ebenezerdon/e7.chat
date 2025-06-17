# OAuth Setup Guide

This guide will help you set up Google and GitHub OAuth authentication for your chat application using Appwrite.

## Prerequisites

- An Appwrite project (Cloud or Self-hosted)
- Google Cloud Console account
- GitHub account

## 1. Appwrite Configuration

### Enable OAuth Providers

1. **Navigate to your Appwrite Console**

   - Go to your Appwrite project dashboard
   - Click on **Auth** in the left sidebar
   - Go to **Settings** tab

2. **Configure OAuth Providers**
   - Scroll down to **OAuth2 Providers**
   - Enable **Google** and **GitHub** providers

## 2. Google OAuth Setup

### Create Google OAuth Credentials

1. **Go to Google Cloud Console**

   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**

   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API" and enable it

3. **Configure OAuth Consent Screen**

   - Go to **APIs & Services** > **OAuth consent screen**
   - Choose **External** user type
   - Fill in required fields:
     - App name: `Your App Name`
     - User support email: `your-email@domain.com`
     - Developer contact: `your-email@domain.com`

4. **Create OAuth Client ID**

   - Go to **APIs & Services** > **Credentials**
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Choose **Web application**
   - Configure:
     - **Name**: `Your App OAuth Client`
     - **Authorized JavaScript origins**:
       ```
       http://localhost:3000
       https://yourdomain.com
       ```
     - **Authorized redirect URIs**:
       ```
       provided in the appwrite console oauth2 modal
       ```

5. **Copy Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Paste them in your Appwrite Google OAuth provider settings

## 3. GitHub OAuth Setup

### Create GitHub OAuth App

1. **Go to GitHub Settings**

   - Visit: https://github.com/settings/applications/new
   - Or go to GitHub > Settings > Developer settings > OAuth Apps

2. **Register New OAuth App**

   - **Application name**: `Your App Name`
   - **Homepage URL**: `https://yourdomain.com` or `http://localhost:3000`
   - **Authorization callback URL**:
     ```
     provided in the appwrite console oauth2 modal
     ```

3. **Get Credentials**
   - Copy the **Client ID**
   - Generate and copy the **Client Secret**
   - Paste them in your Appwrite GitHub OAuth provider settings

## 4. Appwrite OAuth Provider Configuration

### Google Provider

1. In Appwrite Console, find the **Google OAuth2** provider
2. Paste your Google **Client ID** in the **App ID** field
3. Paste your Google **Client Secret** in the **App Secret** field
4. Click **Update**

### GitHub Provider

1. In Appwrite Console, find the **GitHub OAuth2** provider
2. Paste your GitHub **Client ID** in the **App ID** field
3. Paste your GitHub **Client Secret** in the **App Secret** field
4. Click **Update**

## 5. Application URLs

Make sure your application handles these redirect URLs:

### Success Redirect

- **URL**: `/auth/success`
- **Purpose**: Handles successful OAuth authentication
- **Behavior**: Verifies user and redirects to main app

### Failure Redirect

- **URL**: `/auth/failure`
- **Purpose**: Handles failed OAuth authentication
- **Behavior**: Shows error message and redirects back

## 6. Testing

1. **Start your development server**

   ```bash
   npm run dev
   ```

2. **Test OAuth flows**
   - Click "Continue with Google" in the auth modal
   - Click "Continue with GitHub" in the auth modal
   - Verify successful authentication and redirection

## 7. Production Deployment

### Update OAuth Providers

When deploying to production:

1. **Update Google OAuth Client**

   - Add your production domain to **Authorized JavaScript origins**
   - Update the **Authorized redirect URIs** with your production Appwrite endpoint

2. **Update GitHub OAuth App**

   - Update **Homepage URL** to your production domain
   - Update **Authorization callback URL** with your production Appwrite endpoint

3. **Verify Appwrite Settings**
   - Ensure your OAuth providers are configured with production credentials
   - Test authentication flows in production environment

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**

   - Check that your redirect URIs match exactly in both provider settings and Appwrite
   - Ensure you're using the correct Appwrite project ID

2. **"invalid_client" Error**

   - Verify your Client ID and Client Secret are correct
   - Check that the OAuth app is not in development mode (for production)

3. **CORS Issues**
   - Ensure your domain is added to the authorized origins
   - Check Appwrite's allowed origins settings

### Debug Mode

To debug OAuth issues:

1. Check browser network tab for failed requests
2. Review Appwrite logs in the console
3. Verify all URLs and credentials match exactly

## Security Notes

- Never commit OAuth secrets to version control
- Use environment variables for sensitive credentials in production
- Regularly rotate OAuth secrets
- Monitor OAuth usage in your provider dashboards
