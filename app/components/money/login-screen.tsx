import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { fetchJson } from '@/app/components/money/money-utils'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      onLogin()
    } catch (e: any) {
      setError(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 dark:bg-[#070a12]">
      <div className="w-full max-w-sm rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#101624]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-transparent shadow-sm">
            <img src="/pwa-192.png" alt="Logo" className="h-12 w-12 rounded-xl object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-black">{isLogin ? '登录记账系统' : '注册记账系统'}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isLogin ? '欢迎回来，记录你的每一笔开支' : '创建一个新账号来管理你的账单'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">用户名</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              minLength={3}
              className="h-11 bg-slate-50/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">密码</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? '请输入密码' : '设置密码 (至少 6 位)'}
                required
                minLength={6}
                className="h-11 bg-slate-50/50 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <Button type="submit" className="h-11 w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600" disabled={loading || !username || !password}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLogin ? '登录' : '注册'}
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
            >
              {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
