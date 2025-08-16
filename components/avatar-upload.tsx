"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Upload, Trash2, Camera } from "lucide-react"
import { useSession } from "next-auth/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AvatarUploadProps {
  currentImage?: string
  userName?: string
  userEmail?: string
  onAvatarUpdate?: (newAvatarUrl: string | null) => void
}

export function AvatarUpload({ 
  currentImage, 
  userName, 
  userEmail,
  onAvatarUpdate 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { update } = useSession()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, GIF, or WebP image.",
        variant: "destructive"
      })
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      })
      return
    }

    await uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated successfully."
        })

        // Update session with new avatar URL
        await update({
          image: result.avatarUrl,
          name: result.user?.name,
          email: result.user?.email
        })
        
        // Callback to parent component
        onAvatarUpdate?.(result.avatarUrl)

        // Force page refresh to ensure navbar updates
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to upload avatar')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAvatar = async () => {
    setRemoving(true)

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Avatar removed",
          description: "Your profile picture has been removed."
        })

        // Update session to remove avatar
        await update({
          image: null
        })
        
        // Callback to parent component
        onAvatarUpdate?.(null)

        // Force page refresh to ensure navbar updates
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to remove avatar')
      }
    } catch (error) {
      console.error('Avatar removal error:', error)
      toast({
        title: "Removal failed",
        description: error instanceof Error ? error.message : "Failed to remove avatar. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRemoving(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={currentImage || ""} />
          <AvatarFallback className="text-lg">
            {userName?.charAt(0) || userEmail?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        
        {/* Camera overlay for visual feedback */}
        <div 
          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
        >
          <Camera className="h-6 w-6 text-white" />
        </div>
      </div>

      <div>
        <h3 className="font-medium">{userName || "Anonymous User"}</h3>
        <p className="text-sm text-gray-600">{userEmail}</p>
        
        <div className="flex items-center gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerFileInput}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? "Uploading..." : "Change Avatar"}
          </Button>

          {currentImage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={removing}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {removing ? "Removing..." : "Remove"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Avatar</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove your profile picture? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={removeAvatar} className="bg-red-600 hover:bg-red-700">
                    Remove Avatar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
