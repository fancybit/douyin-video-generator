import dynamic from 'next/dynamic'

const LoginForm = dynamic(() => import('./LoginForm'), { ssr: false })

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm />
}