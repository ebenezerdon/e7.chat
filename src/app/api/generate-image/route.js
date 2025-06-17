import { createOpenAI } from '@ai-sdk/openai'
import { Query } from 'node-appwrite'
import { serverDatabases as databases, ID } from '../../../lib/appwrite-server'

export const maxDuration = 60

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ai-chat-db'
const USER_PROFILES_COLLECTION_ID = 'user-profiles'
const FREE_IMAGE_LIMIT = 2

/**
 * Get or create user profile for image generation tracking
 */
async function getUserProfile(userId) {
  try {
    console.log('Getting user profile for userId:', userId)

    // Try to find existing profile
    const documents = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_COLLECTION_ID,
      [Query.equal('userId', userId)],
    )

    console.log('Found existing profiles:', documents.total)

    if (documents.total > 0) {
      console.log('Returning existing profile:', documents.documents[0].$id)
      return documents.documents[0]
    }

    // Create new profile if doesn't exist
    console.log('Creating new profile for user:', userId)
    const now = new Date().toISOString()
    const newProfile = await databases.createDocument(
      DATABASE_ID,
      USER_PROFILES_COLLECTION_ID,
      ID.unique(),
      {
        userId: userId,
        imageGenerationCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      [
        `read("user:${userId}")`,
        `update("user:${userId}")`,
        `delete("user:${userId}")`,
      ],
    )

    console.log('Created new profile:', newProfile.$id)
    return newProfile
  } catch (error) {
    console.error('Error getting/creating user profile:', error)
    throw error
  }
}

/**
 * Increment user's image generation count
 */
async function incrementImageCount(profileId, currentCount) {
  try {
    console.log(
      'Incrementing count for profile:',
      profileId,
      'from',
      currentCount,
      'to',
      currentCount + 1,
    )
    await databases.updateDocument(
      DATABASE_ID,
      USER_PROFILES_COLLECTION_ID,
      profileId,
      {
        imageGenerationCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
      },
    )
    console.log('Successfully incremented count')
  } catch (error) {
    console.error('Error incrementing image count:', error)
    throw error
  }
}

/**
 * Get user ID from request headers (for authenticated users)
 */
function getUserIdFromRequest(req) {
  return req.headers.get('X-User-ID')
}

export async function POST(req) {
  try {
    const {
      prompt,
      size = '1024x1024',
      quality = 'standard',
    } = await req.json()

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Check for user's OpenAI API key in headers
    const userApiKey = req.headers.get('X-User-API-Key')
    const userId = getUserIdFromRequest(req)

    console.log('Image generation request:', {
      hasUserApiKey: !!userApiKey,
      userId: userId,
      hasServerKey: !!process.env.OPENAI_API_KEY,
    })

    // If user doesn't have their own API key, check their generation limit
    if (!userApiKey && userId) {
      try {
        const userProfile = await getUserProfile(userId)

        if (userProfile.imageGenerationCount >= FREE_IMAGE_LIMIT) {
          return Response.json(
            {
              error: `You've reached your free image generation limit (${FREE_IMAGE_LIMIT} images). Please add your own OpenAI API key to continue generating images.`,
              limitReached: true,
              currentCount: userProfile.imageGenerationCount,
              limit: FREE_IMAGE_LIMIT,
            },
            { status: 403 },
          )
        }
      } catch (error) {
        console.error('Error checking user limits:', error)
        // If we can't check limits, block the generation for safety
        return Response.json(
          {
            error: 'Unable to verify generation limits. Please try again.',
          },
          { status: 500 },
        )
      }
    }

    // Determine which API key to use
    let apiKey = userApiKey
    if (!userApiKey) {
      // User doesn't have their own key, use server key if available
      if (!process.env.OPENAI_API_KEY) {
        return Response.json(
          {
            error:
              'OpenAI API key is required. Please add your OpenAI API key.',
          },
          { status: 401 },
        )
      }
      apiKey = process.env.OPENAI_API_KEY
    }

    // For guest users (no userId), require their own API key
    if (!userApiKey && !userId) {
      return Response.json(
        {
          error:
            'Please sign in and add your OpenAI API key to generate images.',
          requiresAuth: true,
        },
        { status: 401 },
      )
    }

    const openai = createOpenAI({
      apiKey: apiKey,
    })

    // Use DALL-E 3 for image generation
    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          size: size,
          quality: quality === 'auto' ? 'standard' : quality,
          response_format: 'url',
          n: 1,
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API Error:', error)
      return Response.json(
        { error: error.error?.message || 'Failed to generate image' },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Track image generation for all authenticated users
    let remainingFreeGenerations = null
    if (userId) {
      try {
        const userProfile = await getUserProfile(userId)
        await incrementImageCount(
          userProfile.$id,
          userProfile.imageGenerationCount,
        )

        // Calculate remaining free generations if they're using server key
        if (!userApiKey) {
          remainingFreeGenerations = Math.max(
            0,
            FREE_IMAGE_LIMIT - userProfile.imageGenerationCount - 1,
          )
        }
      } catch (error) {
        console.error('Error updating user count:', error)
        // Don't fail the request if count update fails
      }
    }

    // DALL-E 3 returns image URLs
    const imageUrl = data.data[0].url

    return Response.json({
      imageUrl: imageUrl,
      revisedPrompt: data.data[0].revised_prompt || prompt,
      usedUserKey: !!userApiKey,
      remainingFreeGenerations: remainingFreeGenerations,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
