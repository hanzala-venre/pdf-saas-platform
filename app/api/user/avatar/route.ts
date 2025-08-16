import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'avatars', // Organize uploads in folders
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Crop to square with face detection
            { quality: 'auto', fetch_format: 'auto' } // Optimize quality and format
          ],
          public_id: `user_${session.user.email.replace('@', '_').replace('.', '_')}_${Date.now()}`, // Unique filename
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      ).end(buffer)
    }) as any

    if (!uploadResponse || !uploadResponse.secure_url) {
      throw new Error('Failed to upload image to Cloudinary')
    }

    // Find user first to get the ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, image: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user's avatar in database using user ID
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { image: uploadResponse.secure_url },
      select: { image: true, name: true, email: true, id: true }
    })

    console.log('Avatar updated in database:', {
      userId: updatedUser.id,
      newImage: updatedUser.image,
      email: session.user.email
    })

    return NextResponse.json({
      message: 'Avatar updated successfully',
      avatarUrl: updatedUser.image,
      cloudinaryPublicId: uploadResponse.public_id,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image
      }
    })

  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload avatar. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they have an avatar
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, image: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has a Cloudinary avatar, delete it from Cloudinary
    if (user.image && user.image.includes('cloudinary.com')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = user.image.split('/')
        const publicIdWithExtension = urlParts[urlParts.length - 1]
        const publicId = `avatars/${publicIdWithExtension.split('.')[0]}`
        
        await cloudinary.uploader.destroy(publicId)
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError)
        // Continue with database update even if Cloudinary deletion fails
      }
    }

    // Remove avatar from database using user ID
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { image: null },
      select: { id: true, name: true, email: true, image: true }
    })

    console.log('Avatar removed from database:', {
      userId: updatedUser.id,
      email: session.user.email
    })

    return NextResponse.json({ 
      message: 'Avatar removed successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Avatar deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to remove avatar. Please try again.' },
      { status: 500 }
    )
  }
}
