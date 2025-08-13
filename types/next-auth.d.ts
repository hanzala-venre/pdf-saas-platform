declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      subscription?: string
      role?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    subscription?: string
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subscription?: string
    role?: string
  }
}
