import dynamic from 'next/dynamic'

const LoginForm = dynamic(() => import('./LoginForm'), { ssr: false })

export const dynamic = 'force-static'

export default function LoginPage() {
  return <LoginForm />
}